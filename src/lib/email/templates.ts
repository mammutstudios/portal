const INK = "#140018";
const MUTED = "#645d73";
const BORDER = "#dedbdf";

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

/** Sober sjabloon in de huisstijl. Tabellen en inline stijl, want mailclients. */
function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="nl"><body style="margin:0;padding:24px;background:#fafaf9;font-family:Helvetica,Arial,sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;padding:32px">
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${INK}">${title}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:16px 8px;font-size:12px;color:${MUTED}">
      Je krijgt deze mail omdat je meldingen aan hebt staan in het portaal van Mammut Studios.
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
