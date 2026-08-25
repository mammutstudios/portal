const INK = "#140018";
const MUTED = "#645d73";
const BORDER = "#dedbdf";

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const VOET_MELDINGEN =
  "Je krijgt deze mail omdat je meldingen aan hebt staan in het portaal van Mammut Studios.";

/** Sober sjabloon in de huisstijl. Tabellen en inline stijl, want mailclients. */
function layout(title: string, body: string, voet: string = VOET_MELDINGEN) {
  return `<!doctype html>
<html lang="nl"><body style="margin:0;padding:24px;background:#fafaf9;font-family:Helvetica,Arial,sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;padding:32px">
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${INK}">${title}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:16px 8px;font-size:12px;line-height:1.6;color:${MUTED}">
      ${voet}
    </td></tr>
  </table>
</body></html>`;
}

export function newInvoiceMail(invoice: {
  invoiceNumber: string | null;
  reference: string | null;
  amountExclTax: number | null;
  invoiceDate: string | null;
  clientName: string | null;
}) {
  const nummer = invoice.invoiceNumber ? `Factuur ${invoice.invoiceNumber}` : "Nieuwe factuur";
  const datum = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString("nl-NL", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : null;

  const rows = [
    invoice.reference && ["Omschrijving", invoice.reference],
    datum && ["Factuurdatum", datum],
    invoice.amountExclTax != null && ["Bedrag excl. btw", euro(invoice.amountExclTax)],
  ].filter(Boolean) as [string, string][];

  const body = `
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${MUTED}">
      Er staat een nieuwe factuur voor ${invoice.clientName ?? "je"} klaar.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
      ${rows
        .map(
          ([k, v]) => `<tr>
            <td style="padding:8px 0;color:${MUTED};width:45%">${k}</td>
            <td style="padding:8px 0;color:${INK};font-weight:600">${v}</td>
          </tr>`,
        )
        .join("")}
    </table>`;

  return { subject: `${nummer}${invoice.clientName ? ` — ${invoice.clientName}` : ""}`, html: layout(nummer, body) };
}

/**
 * De uitnodiging voor het klantportaal.
 *
 * Bewust geen inloglink in deze mail. Supabase maakt die met PKCE, en dan hoort
 * de bijbehorende sleutel in de browser die om de link vroeg. Vraagt de server
 * hem aan, dan komt de ontvanger er niet mee binnen. Daarom wijst deze mail
 * naar de inlogpagina, waar de klant zelf zijn link aanvraagt.
 */
export function portalInviteMail(invite: {
  contactName: string | null;
  clientNames: string[];
  loginUrl: string;
}) {
  const naam = invite.contactName?.split(" ")[0];
  const organisaties = invite.clientNames.filter(Boolean);
  const waarvoor =
    organisaties.length === 1
      ? `het portaal van ${organisaties[0]}`
      : organisaties.length > 1
        ? `de portalen van ${organisaties.slice(0, -1).join(", ")} en ${organisaties.at(-1)}`
        : "je klantportaal";

  const body = `
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${MUTED}">
      ${naam ? `Hoi ${naam}, je` : "Je"} hebt vanaf nu toegang tot ${waarvoor}.
      Daar staan de projecten waar we aan werken, wat er van jou nodig is en je facturen.
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:${MUTED}">
      Inloggen gaat zonder wachtwoord. Vul je e-mailadres in, dan sturen we je een inloglink.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="background:${INK};border-radius:10px">
        <a href="${invite.loginUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">Naar het portaal</a>
      </td>
    </tr></table>`;

  return {
    subject: "Je hebt toegang tot het Mammut Portal",
    html: layout(
      "Welkom bij het Mammut Portal",
      body,
      "Je krijgt deze mail omdat wij je als contactpersoon toegang hebben gegeven. Klopt dat niet, laat het ons dan weten.",
    ),
  };
}
