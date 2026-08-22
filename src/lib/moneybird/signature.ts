import crypto from "node:crypto";

/**
 * Verifieert de Moneybird-Signature header.
 *
 * Header:  Moneybird-Signature: t=<unix-seconden>,v1=<hex>[,v1=<hex>...]
 * Digest:  HMAC-SHA256(secret, "<t>.<ruwe body>"), hex
 *
 * De body moet exact de ontvangen bytes zijn — opnieuw serialiseren van de JSON
 * breekt de vergelijking. Tijdens een sleutelrotatie staan er meerdere v1-waarden
 * in de header; één match volstaat. Onbekende schema's worden genegeerd om
 * downgrade-aanvallen te voorkomen.
 */
export function verifyMoneybirdSignature(
  header: string | null,
  rawBody: string,
  secret: string,
  toleranceSeconds = 300,
): { ok: true } | { ok: false; reason: string } {
  if (!header) return { ok: false, reason: "ontbrekende Moneybird-Signature header" };
  if (!secret) return { ok: false, reason: "geen signing secret geconfigureerd" };

  let timestamp: string | null = null;
  const digests: string[] = [];

  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1") digests.push(value);
  }

  if (!timestamp) return { ok: false, reason: "geen timestamp in de header" };
  if (digests.length === 0) return { ok: false, reason: "geen v1-digest in de header" };

  const t = Number(timestamp);
  if (!Number.isFinite(t)) return { ok: false, reason: "ongeldige timestamp" };
  const age = Math.abs(Date.now() / 1000 - t);
  if (age > toleranceSeconds) {
    return { ok: false, reason: `timestamp ${Math.round(age)}s buiten de marge` };
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  for (const candidate of digests) {
    let candidateBuf: Buffer;
    try {
      candidateBuf = Buffer.from(candidate, "hex");
    } catch {
      continue;
    }
    if (candidateBuf.length !== expectedBuf.length) continue;
    if (crypto.timingSafeEqual(candidateBuf, expectedBuf)) return { ok: true };
  }

  return { ok: false, reason: "geen enkele digest komt overeen" };
}
