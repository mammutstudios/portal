"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logActiviteit } from "@/lib/activity";
import { sendMail } from "@/lib/email/send";
import { portalInviteMail } from "@/lib/email/templates";

/**
 * Toegang tot het klantportaal, uitgedeeld vanaf de contactpersoon.
 *
 * Een contact uitnodigen zet drie dingen klaar die anders met de hand in
 * Supabase moeten: de gebruiker in auth, zijn rij in `profiles`, en een
 * koppeling in `client_members` per organisatie waar het contact aan hangt.
 * Die laatste bepaalt via de RLS wat de klant te zien krijgt.
 *
 * Alles loopt met de service role, want een admin mag de profielrij van een
 * klant niet lezen of schrijven. Daarom staat de rolcontrole hier expliciet:
 * een server action is gewoon een endpoint, en zonder die controle zou elke
 * ingelogde klant zichzelf toegang kunnen geven tot een andere organisatie.
 */
export type ToegangResultaat =
  | { ok: true; bericht: string }
  | { ok: false; fout: string };

/** Waar de klant heen gaat om in te loggen. */
function loginUrl() {
  const basis = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.mammutstudios.com";
  return `${basis.replace(/\/$/, "")}/login`;
}

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub as string | undefined;
  if (!uid) return false;

  const { data: profile } = await createServiceClient()
    .from("profiles")
    .select("role")
    .eq("id", uid)
    .maybeSingle();

  return profile?.role === "admin";
}

type ContactRij = {
  id: string;
  name: string;
  email: string | null;
  contact_clients: { client_id: string; clients: { name: string } | null }[];
};

async function haalContact(id: string): Promise<ContactRij | null> {
  const { data } = await createServiceClient()
    .from("contacts")
    .select("id, name, email, contact_clients(client_id, clients(name))")
    .eq("id", id)
    .maybeSingle();

  return (data as ContactRij | null) ?? null;
}

/**
 * Het id van de gebruiker bij dit adres, en anders een nieuwe.
 *
 * `email_confirm` staat aan omdat er geen wachtwoord of bevestigingsmail aan
 * te pas komt: wie de inloglink in zijn mailbox krijgt, heeft daarmee al
 * bewezen dat het adres van hem is.
 */
async function vindOfMaakGebruiker(email: string, naam: string): Promise<string | null> {
  const service = createServiceClient();

  const { data: bestaand } = await service
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (bestaand) return bestaand.id as string;

  const { data, error } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: naam },
  });

  if (data?.user) return data.user.id;
  if (!error) return null;

  // Het adres bestaat al in auth maar had geen profielrij. Opzoeken dus, want
  // een tweede gebruiker op hetzelfde adres kan niet.
  for (let page = 1; page <= 20; page++) {
    const { data: lijst } = await service.auth.admin.listUsers({ page, perPage: 200 });
    const treffer = lijst?.users.find((u) => u.email?.toLowerCase() === email);
    if (treffer) return treffer.id;
    if (!lijst || lijst.users.length < 200) break;
  }

  return null;
}

export async function inviteContactAction(formData: FormData): Promise<ToegangResultaat> {
  if (!(await isAdmin())) return { ok: false, fout: "Alleen een beheerder kan toegang geven." };

  const contactId = formData.get("contact_id") as string;
  const contact = await haalContact(contactId);
  if (!contact) return { ok: false, fout: "Deze contactpersoon bestaat niet meer." };

  const email = contact.email?.trim().toLowerCase();
  if (!email) return { ok: false, fout: "Vul eerst een e-mailadres in bij deze contactpersoon." };

  const koppelingen = contact.contact_clients ?? [];
  if (koppelingen.length === 0) {
    return { ok: false, fout: "Koppel eerst een organisatie, anders ziet deze persoon een leeg portaal." };
  }

  const userId = await vindOfMaakGebruiker(email, contact.name);
  if (!userId) return { ok: false, fout: "Kon geen gebruiker aanmaken voor dit e-mailadres." };

  const service = createServiceClient();

  const { error: profielFout } = await service
    .from("profiles")
    .upsert({ id: userId, email, full_name: contact.name, role: "client" }, { onConflict: "id" });

  if (profielFout) return { ok: false, fout: `Profiel opslaan mislukt: ${profielFout.message}` };

  // Alleen wat er nog niet is: client_members heeft geen unieke sleutel op de
  // combinatie, dus zonder deze stap krijg je dubbele rijen bij een tweede
  // uitnodiging.
  const { data: bestaandeLeden } = await service
    .from("client_members")
    .select("client_id")
    .eq("user_id", userId);

  const alGekoppeld = new Set((bestaandeLeden ?? []).map((l) => l.client_id as string));
  const nieuw = koppelingen.filter((k) => !alGekoppeld.has(k.client_id));

  if (nieuw.length > 0) {
    const { error } = await service
      .from("client_members")
      .insert(nieuw.map((k) => ({ user_id: userId, client_id: k.client_id })));

    if (error) return { ok: false, fout: `Koppelen aan de organisatie mislukt: ${error.message}` };
  }

  const organisaties = koppelingen.map((k) => k.clients?.name).filter(Boolean) as string[];

  // Analytics staat alleen in de navigatie als de klant een site heeft die we
  // meten (portal/layout.tsx), dus beloven we het in de mail ook alleen dan.
  const { data: metingen } = await service
    .from("clients")
    .select("plausible_site_id")
    .in("id", koppelingen.map((k) => k.client_id));

  const mail = portalInviteMail({
    contactName: contact.name,
    clientNames: organisaties,
    loginUrl: loginUrl(),
    metAnalytics: (metingen ?? []).some((c) => Boolean(c.plausible_site_id)),
  });

  const { sent, error: mailFout } = await sendMail({ to: [email], subject: mail.subject, html: mail.html });

  await logActiviteit({
    action: "portaal.uitgenodigd",
    entityType: "gebruiker",
    entityId: userId,
    entityLabel: contact.name,
    clientId: koppelingen[0]?.client_id ?? null,
    meta: { email, organisaties },
  });

  revalidatePath(`/dashboard/contacts/${contactId}`);
  revalidatePath("/dashboard/klantportaal");

  if (sent === 0) {
    return {
      ok: true,
      bericht: `Toegang geregeld, maar de uitnodiging is niet verstuurd (${mailFout ?? "onbekende fout"}).`,
    };
  }

  return { ok: true, bericht: `Uitnodiging verstuurd naar ${email}.` };
}

export async function revokeContactAccessAction(formData: FormData): Promise<ToegangResultaat> {
  if (!(await isAdmin())) return { ok: false, fout: "Alleen een beheerder kan toegang intrekken." };

  const contactId = formData.get("contact_id") as string;
  const contact = await haalContact(contactId);
  if (!contact?.email) return { ok: false, fout: "Deze contactpersoon heeft geen e-mailadres." };

  const email = contact.email.trim().toLowerCase();
  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) return { ok: false, fout: "Deze contactpersoon heeft geen account." };

  // De koppelingen weg, het account blijft. Zo verliest iemand zijn toegang
  // zonder dat zijn naam onder eerdere berichten en activiteiten verdwijnt.
  const { error } = await service.from("client_members").delete().eq("user_id", profile.id);
  if (error) return { ok: false, fout: `Intrekken mislukt: ${error.message}` };

  await logActiviteit({
    action: "portaal.ingetrokken",
    entityType: "gebruiker",
    entityId: profile.id as string,
    entityLabel: contact.name,
    meta: { email },
  });

  revalidatePath(`/dashboard/contacts/${contactId}`);
  revalidatePath("/dashboard/klantportaal");

  return { ok: true, bericht: "Toegang ingetrokken." };
}
