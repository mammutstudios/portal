"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { PHASE_LABEL, type ProjectPhase } from "@/lib/types";
import { logActiviteit } from "@/lib/activity";

/** Zoals de statussen in de app heten. */
const STATUS_LABEL: Record<string, string> = {
  upcoming: "Upcoming",
  active: "Actief",
  on_hold: "On hold",
  review: "Review",
  completed: "Afgerond",
};

export async function createProjectAction(formData: FormData) {
  const title = formData.get("title") as string;
  const client_id = formData.get("client_id") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;
  const deadline = formData.get("deadline") as string;
  const tags = formData.getAll("tags") as string[];
  const phase = formData.get("phase") as string;
  const next_step = formData.get("next_step") as string;
  const client_action = formData.get("client_action") as string;
  const live_url = formData.get("live_url") as string;
  const staging_url = formData.get("staging_url") as string;
  const progress = formData.get("progress") as string;
  const budget_amount = formData.get("budget_amount") as string;
  const lead_profile_id = formData.get("lead_profile_id") as string;

  if (!title?.trim()) return { error: "Naam is verplicht" };
  if (!client_id) return { error: "Organisatie is verplicht" };

  const supabase = await createClient();
  const { data: nieuw, error } = await supabase.from("projects").insert({
    title: title.trim(),
    client_id,
    description: description?.trim() || null,
    status: status || "active",
    deadline: deadline || null,
    tags: tags.length > 0 ? tags : [],
    phase: phase || null,
    next_step: next_step?.trim() || null,
    client_action: client_action?.trim() || null,
    live_url: live_url?.trim() || null,
    staging_url: staging_url?.trim() || null,
    progress: progress === "" || progress == null ? null : Number(progress),
    budget_amount: budget_amount?.trim() ? Number(budget_amount) : null,
    lead_profile_id: lead_profile_id || null,
  });

  if (error) return { error: error.message };

  await logActiviteit({
    action: "project.aangemaakt",
    entityType: "project",
    entityId: (nieuw as { id?: string } | null)?.id ?? null,
    entityLabel: title.trim(),
    clientId: client_id,
  });

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Een regel op de tijdlijn die niemand heeft getypt. Faalt hij, dan mag dat de
 * wijziging zelf niet tegenhouden: de tijdlijn is een verslag, geen boekhouding.
 */
async function noteerOpTijdlijn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  kind: string,
  body: string,
  profileId: string | null,
) {
  const { error } = await supabase
    .from("project_comments")
    .insert({ project_id: projectId, profile_id: profileId, kind, body });
  if (error) console.error("[tijdlijn] vastleggen mislukt:", error.message);
}

export async function updateProjectAction(id: string, formData: FormData) {
  const title = formData.get("title") as string;
  const client_id = formData.get("client_id") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;
  const deadline = formData.get("deadline") as string;
  const tags = formData.getAll("tags") as string[];
  const phase = formData.get("phase") as string;
  const next_step = formData.get("next_step") as string;
  const client_action = formData.get("client_action") as string;
  const live_url = formData.get("live_url") as string;
  const staging_url = formData.get("staging_url") as string;
  const progress = formData.get("progress") as string;
  const budget_amount = formData.get("budget_amount") as string;
  const lead_profile_id = formData.get("lead_profile_id") as string;

  if (!title?.trim()) return { error: "Naam is verplicht" };

  const supabase = await createClient();

  // Eerst de oude waarden, anders valt achteraf niet te zien wát er wijzigde.
  const [{ data: vorige }, { data: { user } }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "title, status, phase, budget_amount, deadline, lead_profile_id, description, tags, next_step, client_action, live_url, staging_url, progress",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const { error } = await supabase.from("projects").update({
    title: title.trim(),
    client_id: client_id || undefined,
    description: description?.trim() || null,
    status: status || "active",
    deadline: deadline || null,
    tags: tags,
    phase: phase || null,
    next_step: next_step?.trim() || null,
    client_action: client_action?.trim() || null,
    live_url: live_url?.trim() || null,
    staging_url: staging_url?.trim() || null,
    progress: progress === "" || progress == null ? null : Number(progress),
    budget_amount: budget_amount?.trim() ? Number(budget_amount) : null,
    lead_profile_id: lead_profile_id || null,
  }).eq("id", id);

  if (error) return { error: error.message };

  // Wát er veranderde, veld voor veld. "Bijgewerkt" zonder die lijst zegt
  // niets: dan zie je wel dat er iets gebeurde, maar niet of het het budget
  // was of de status.
  const wijzigingen = verschillenIn(vorige, {
    title: title.trim(),
    status,
    phase: phase || null,
    budget_amount: budget_amount?.trim() ? Number(budget_amount) : null,
    deadline: deadline || null,
    lead_profile_id: lead_profile_id || null,
    description: description?.trim() || null,
    tags,
    next_step: next_step?.trim() || null,
    client_action: client_action?.trim() || null,
    live_url: live_url?.trim() || null,
    staging_url: staging_url?.trim() || null,
    progress: progress === "" || progress == null ? null : Number(progress),
  });

  // De lead is een id; die zegt pas iets met een naam erbij.
  const leadWijziging = wijzigingen.find((w) => w.veld === "Lead");
  if (leadWijziging) {
    const namen = await namenVan(supabase, [
      (vorige as { lead_profile_id?: string | null } | null)?.lead_profile_id ?? null,
      lead_profile_id || null,
    ]);
    leadWijziging.van = namen[0];
    leadWijziging.naar = namen[1];
  }

  // Niets veranderd is geen gebeurtenis; een opslaan zonder wijziging hoort
  // het log niet te vullen.
  if (wijzigingen.length > 0) {
    await logActiviteit({
      action: "project.bijgewerkt",
      entityType: "project",
      entityId: id,
      entityLabel: title.trim(),
      clientId: client_id || null,
      meta: { wijzigingen },
    });
  }

  if (vorige) {
    const wie = user?.id ?? null;
    const euro = (n: number) =>
      new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
    const datum = (d: string) =>
      new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

    if (vorige.status !== status && status) {
      await noteerOpTijdlijn(supabase, id, "status", `Status gewijzigd naar ${STATUS_LABEL[status] ?? status}`, wie);
    }
    if ((vorige.phase ?? null) !== (phase || null) && phase) {
      await noteerOpTijdlijn(supabase, id, "fase", `Fase gewijzigd naar ${PHASE_LABEL[phase as ProjectPhase] ?? phase}`, wie);
    }

    const nieuwBudget = budget_amount?.trim() ? Number(budget_amount) : null;
    if ((vorige.budget_amount ?? null) !== nieuwBudget && nieuwBudget != null) {
      await noteerOpTijdlijn(
        supabase,
        id,
        "budget",
        vorige.budget_amount == null
          ? `Budget vastgesteld op ${euro(nieuwBudget)}`
          : `Budget gewijzigd naar ${euro(nieuwBudget)}`,
        wie,
      );
    }

    const nieuweDeadline = deadline || null;
    if ((vorige.deadline ?? null) !== nieuweDeadline && nieuweDeadline) {
      await noteerOpTijdlijn(
        supabase,
        id,
        "deadline",
        vorige.deadline == null
          ? `Opleverdatum gezet op ${datum(nieuweDeadline)}`
          : `Opleverdatum verzet naar ${datum(nieuweDeadline)}`,
        wie,
      );
    }

    const nieuweLead = lead_profile_id || null;
    if ((vorige.lead_profile_id ?? null) !== nieuweLead && nieuweLead) {
      const { data: lead } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", nieuweLead)
        .maybeSingle();
      await noteerOpTijdlijn(supabase, id, "lead", `${lead?.full_name ?? "Iemand"} is nu de lead`, wie);
    }
  }

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
  revalidatePath("/dashboard");
  // De klant ziet dezelfde velden in het portaal.
  revalidatePath("/portal/projecten");
  revalidatePath(`/portal/projecten/${id}`);
  return { success: true };
}

export async function quickCreateProjectAction(title: string, client_id: string) {
  if (!title?.trim()) throw new Error("Naam is verplicht");
  if (!client_id) throw new Error("Organisatie is verplicht");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ title: title.trim(), client_id, status: "active" })
    .select("id, title, client_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/finance/transactions");
  return data;
}

/**
 * Een factuur aan een project hangen, of er weer los van maken.
 *
 * Facturen blijven altijd aan een klant gekoppeld; dit is een extra verfijning
 * zodat een projectpagina zijn eigen facturen kan tonen. Moneybird kent geen
 * projecten, dus deze koppeling leggen we zelf.
 */
export async function linkInvoiceToProjectAction(invoiceId: string, projectId: string | null) {
  const supabase = await createClient();

  // select() erachter, zodat we zien of er werkelijk iets is bijgewerkt. Zonder
  // dat komt een update die door row level security wordt tegengehouden terug
  // als een succes, en meldt de knop niets terwijl er niets gebeurde.
  const { data, error } = await supabase
    .from("moneybird_invoices")
    .update({ project_id: projectId })
    .eq("id", invoiceId)
    .select("id, reference");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Koppelen lukte niet: geen rechten of factuur niet gevonden" };
  }

  const kenmerk = (data[0] as { reference?: string | null }).reference ?? "zonder kenmerk";
  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("title")
      .eq("id", projectId)
      .maybeSingle();
    await logActiviteit({
      action: "factuur.gekoppeld",
      entityType: "factuur",
      entityId: invoiceId,
      entityLabel: kenmerk,
      meta: { project: (project as { title?: string } | null)?.title ?? null },
    });
  } else {
    await logActiviteit({
      action: "factuur.ontkoppeld",
      entityType: "factuur",
      entityId: invoiceId,
      entityLabel: kenmerk,
    });
  }

  revalidatePath("/dashboard/projects");
  if (projectId) {
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/portal/projecten/${projectId}`);
  }
  return { success: true };
}

/** Een bericht bij een project plaatsen. */
export async function addProjectCommentAction(projectId: string, body: string) {
  const tekst = body.trim();
  if (!tekst) return { error: "Bericht is leeg" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const { error } = await supabase
    .from("project_comments")
    .insert({ project_id: projectId, profile_id: user.id, body: tekst });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/portal/projecten/${projectId}`);
  return { success: true };
}

/** Je eigen bericht weghalen. De databasepolicy bewaakt dat "eigen". */
export async function deleteProjectCommentAction(commentId: string, projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_comments").delete().eq("id", commentId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/portal/projecten/${projectId}`);
  return { success: true };
}

/** Eén veld dat veranderde, zoals het in het activiteitenlog komt te staan. */
type Wijziging = { veld: string; van: string | null; naar: string | null };

const euroTekst = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const datumTekst = (d: string) =>
  new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

/** Lange teksten afkappen; een logregel is geen tekstveld. */
const kort = (t: string) => (t.length > 60 ? `${t.slice(0, 57)}…` : t);

/** Namen bij profiel-ids, in dezelfde volgorde. Eén query voor allebei. */
async function namenVan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: (string | null)[],
): Promise<(string | null)[]> {
  const teZoeken = ids.filter(Boolean) as string[];
  if (teZoeken.length === 0) return ids.map(() => null);

  const { data } = await supabase.from("profiles").select("id, full_name").in("id", teZoeken);
  const opId = new Map((data ?? []).map((p) => [p.id as string, p.full_name as string | null]));
  return ids.map((id) => (id ? opId.get(id) ?? null : null));
}

/**
 * Wat er tussen de oude en de nieuwe waarden verschilt.
 *
 * Vergelijkt op de weergegeven tekst, niet op de ruwe waarde: null en een lege
 * string zijn voor een mens hetzelfde, en 1000 en "1000" ook.
 */
function verschillenIn(
  vorige: Record<string, unknown> | null,
  nieuw: Record<string, unknown>,
): Wijziging[] {
  if (!vorige) return [];

  const velden: { sleutel: string; label: string; toon: (v: unknown) => string | null }[] = [
    { sleutel: "title", label: "Naam", toon: (v) => (v ? String(v) : null) },
    { sleutel: "status", label: "Status", toon: (v) => (v ? STATUS_LABEL[String(v)] ?? String(v) : null) },
    {
      sleutel: "phase",
      label: "Fase",
      toon: (v) => (v ? PHASE_LABEL[String(v) as ProjectPhase] ?? String(v) : null),
    },
    {
      sleutel: "budget_amount",
      label: "Projectbedrag",
      toon: (v) => (v == null || v === "" ? null : euroTekst(Number(v))),
    },
    { sleutel: "deadline", label: "Opleverdatum", toon: (v) => (v ? datumTekst(String(v)) : null) },
    { sleutel: "lead_profile_id", label: "Lead", toon: (v) => (v ? String(v) : null) },
    { sleutel: "description", label: "Omschrijving", toon: (v) => (v ? kort(String(v)) : null) },
    {
      sleutel: "tags",
      label: "Type",
      toon: (v) => (Array.isArray(v) && v.length > 0 ? v.join(", ") : null),
    },
    { sleutel: "next_step", label: "Volgende stap", toon: (v) => (v ? kort(String(v)) : null) },
    { sleutel: "client_action", label: "Van de klant nodig", toon: (v) => (v ? kort(String(v)) : null) },
    { sleutel: "live_url", label: "Live-url", toon: (v) => (v ? String(v) : null) },
    { sleutel: "staging_url", label: "Testomgeving", toon: (v) => (v ? String(v) : null) },
    {
      sleutel: "progress",
      label: "Voortgang",
      toon: (v) => (v == null || v === "" ? null : `${Number(v)}%`),
    },
  ];

  const uit: Wijziging[] = [];
  for (const { sleutel, label, toon } of velden) {
    const van = toon(vorige[sleutel]);
    const naar = toon(nieuw[sleutel]);
    if (van !== naar) uit.push({ veld: label, van, naar });
  }
  return uit;
}
