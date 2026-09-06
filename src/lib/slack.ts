/**
 * Berichten naar Slack.
 *
 * Via een Incoming Webhook: één URL die aan één kanaal vastzit. Geen OAuth,
 * geen tokens die verlopen, en niets dat de app in Slack mag behalve in dat
 * ene kanaal posten.
 *
 * Zonder SLACK_WEBHOOK_URL wordt er niets verstuurd maar alleen gelogd,
 * dezelfde afspraak als bij sendMail: zo kun je de hele keten lokaal
 * doorlopen zonder kanaal, en zie je in de terminal wat er de deur uit zou
 * gaan.
 */
export function slackIsConfigured() {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

/**
 * Eén regel vet bovenaan, daaronder de details, en waar het over gaat als
 * link. Slack toont `blocks` netter dan platte tekst, maar `text` moet er ook
 * bij: dat is wat je in een melding op je telefoon leest.
 */
export type SlackBericht = {
  /** De regel in de melding zelf. Kort, zonder opmaak. */
  tekst: string;
  /** Vetgedrukte kop in het kanaal. Weglaten laat alleen `tekst` staan. */
  kop?: string;
  /** Losse regels onder de kop, in Slack-opmaak (mrkdwn). */
  regels?: string[];
  /** Knop onderaan, naar het ticket of de pagina waar het over gaat. */
  link?: { label: string; url: string };
};

export async function stuurSlack(bericht: SlackBericht): Promise<{ sent: boolean; error?: string }> {
  if (!slackIsConfigured()) {
    console.info(`[slack] niet verstuurd (SLACK_WEBHOOK_URL ontbreekt)\n       ${bericht.tekst}`);
    return { sent: false, error: "Slack is niet geconfigureerd" };
  }

  const blocks: unknown[] = [];

  if (bericht.kop) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${bericht.kop}*` },
    });
  }

  if (bericht.regels?.length) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: bericht.regels.join("\n") },
    });
  }

  if (bericht.link) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: bericht.link.label },
          url: bericht.link.url,
        },
      ],
    });
  }

  try {
    const antwoord = await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: bericht.tekst,
        ...(blocks.length > 0 ? { blocks } : {}),
      }),
    });

    if (!antwoord.ok) {
      // Slack antwoordt met platte tekst, niet met JSON: "invalid_payload",
      // "channel_not_found", of gewoon "no_service" als de webhook is
      // ingetrokken.
      const reden = await antwoord.text();
      console.error(`[slack] versturen mislukt (${antwoord.status}): ${reden}`);
      return { sent: false, error: reden };
    }

    return { sent: true };
  } catch (e) {
    // Een melding mag de handeling eronder nooit laten mislukken: het ticket
    // staat er al, en dat een bericht niet aankwam verandert daar niets aan.
    const reden = e instanceof Error ? e.message : "onbekende fout";
    console.error(`[slack] versturen mislukt: ${reden}`);
    return { sent: false, error: reden };
  }
}

/** De basis-URL voor links in een bericht, zodat ze buiten de app werken. */
export function appUrl(pad: string): string {
  const basis = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  return `${basis}${pad}`;
}
