const INK = "#140018";
const MUTED = "#645d73";
const BORDER = "#dedbdf";

/** Absoluut, want een mail heeft geen basis-url. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.mammutstudios.com";
const LOGO = `${SITE}/brand/mammut-studios/mammut-icon-mail.png`;

/**
 * Altijd licht. De kaart hoort wit te blijven, ook in een donkere mailclient.
 *
 * Drie lagen, want elke client doet het anders. `color-scheme` houdt Apple Mail
 * en Outlook voor macOS tegen. De `data-ogsb` en `data-ogsc` regels zetten terug
 * wat Outlook.com zelf overschrijft; die attributen plakt Outlook op elementen
 * waarvan het de achtergrond of de tekstkleur heeft aangepast. En alles heeft
 * een eigen achtergrondkleur, zodat er nergens iets doorschijnt.
 *
 * Clients die de hele mail simpelweg omkeren, zoals Gmail op Android en sommige
 * bureaubladclients, trekken zich hier niets van aan. Daar is met html niets
 * tegen te doen.
 */
const ALTIJD_LICHT = `
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <style>
    :root { color-scheme: light only; }
    [data-ogsb] .vel,   [data-ogsc] .vel   { background: #fafaf9 !important; }
    [data-ogsb] .kaart, [data-ogsc] .kaart { background: #ffffff !important; }
    [data-ogsb] .knop,  [data-ogsc] .knop  { background: ${INK} !important; }
    [data-ogsc] .titel  { color: ${INK} !important; }
    [data-ogsc] .tekst  { color: ${MUTED} !important; }
    [data-ogsc] .knop a { color: #ffffff !important; }
  </style>`;

/** De knop zoals hij in elke mail terugkomt. */
function knop(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td class="knop" style="background:${INK};border-radius:10px">
          <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">${label}</a>
        </td>
      </tr></table>`;
}

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const VOET_MELDINGEN =
  "Je krijgt deze mail omdat je meldingen aan hebt staan in het portaal van Mammut Studios.";

/** Sober sjabloon in de huisstijl. Tabellen en inline stijl, want mailclients. */
function layout(title: string, body: string, voet: string = VOET_MELDINGEN) {
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">${ALTIJD_LICHT}
</head>
<body class="vel" style="margin:0;padding:24px;background:#fafaf9;font-family:Helvetica,Arial,sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td class="kaart" style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;padding:32px">
      <img src="${LOGO}" width="48" height="48" alt="Mammut Studios" style="display:block;border:0;margin:0 0 24px">
      <h1 class="titel" style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${INK}">${title}</h1>
      ${body}
    </td></tr>
    <tr><td class="tekst" style="padding:16px 8px;font-size:12px;line-height:1.6;color:${MUTED}">
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
 *
 * De iconen zijn dezelfde als in de portaalnavigatie, maar dan als png in een
 * lavendel tegel. Een mailclient rendert geen svg en laadt geen icoonfont, en
 * ronde hoeken op een tabelcel overleven Outlook niet, dus zitten de tegel en
 * de radius in de afbeelding zelf. Ze staan in `public/brand/mail`.
 */
export function portalInviteMail(invite: {
  contactName: string | null;
  clientNames: string[];
  loginUrl: string;
}) {
  const naam = invite.contactName?.trim().split(" ")[0];
  const organisaties = invite.clientNames.filter(Boolean);
  const waarvoor =
    organisaties.length === 1
      ? organisaties[0]
      : organisaties.length > 1
        ? `${organisaties.slice(0, -1).join(", ")} en ${organisaties.at(-1)}`
        : null;

  const punten: [string, string, string][] = [
    ["overzicht", "Overzicht", "Wat er op dit moment speelt en waar we staan."],
    ["projecten", "Projecten", "Waar we aan werken, hoe het ervoor staat en wat er van jou nodig is."],
    ["facturen", "Facturen", "Alles wat we hebben gefactureerd, met de pdf erbij."],
    ["analytics", "Analytics", "Hoeveel mensen je site bezoeken, en waar ze vandaan komen."],
  ];

  const body = `
    <p class="tekst" style="margin:0 0 24px;font-size:14px;line-height:1.6;color:${MUTED}">
      Vanaf nu kun je in het portaal van Mammut Studios${waarvoor ? ` voor ${waarvoor}` : ""}.
      Daar staat op één plek wat er voor je loopt, zodat je het niet meer hoeft terug te zoeken in je mail.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
      ${punten
        .map(
          ([icoon, kop, uitleg]) => `<tr>
            <td width="42" valign="top" style="padding:14px 10px 14px 0;border-top:1px solid ${BORDER}">
              <img src="${SITE}/brand/mail/${icoon}.png" width="32" height="32" alt="" style="display:block;border:0">
            </td>
            <td valign="top" style="padding:14px 0;border-top:1px solid ${BORDER}">
              <div class="titel" style="font-size:14px;font-weight:600;color:${INK}">${kop}</div>
              <div class="tekst" style="font-size:13px;line-height:1.6;color:${MUTED};margin-top:2px">${uitleg}</div>
            </td>
          </tr>`,
        )
        .join("")}
    </table>

    <p class="tekst" style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${MUTED}">
      Inloggen gaat zonder wachtwoord. Je vult je e-mailadres in, wij sturen je een link, en die brengt je naar binnen. Onthouden hoeft dus niets.
    </p>

    ${knop(invite.loginUrl, "Naar het portaal")}`;

  return {
    subject: "Welkom bij het Mammut Portal",
    html: layout(
      naam ? `Welkom, ${naam}` : "Welkom",
      body,
      "Je krijgt deze mail omdat wij je als contactpersoon toegang hebben gegeven. Klopt dat niet, laat het ons dan weten.",
    ),
  };
}
