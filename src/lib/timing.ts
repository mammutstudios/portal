/**
 * Tijdelijke meetpunten om te zien waar een verzoek op productie zijn tijd laat.
 *
 * Lokaal zegt een meting niets: daar draait de dev-bypass, met de service role
 * en zonder proxy-auth of RLS. Alleen op productie is zichtbaar wat een klik
 * echt kost. De regels komen in de runtime-logs van Vercel terecht.
 *
 * Zet TIMING=0 in de omgeving om ze te dempen, of haal dit bestand weg zodra
 * de vraag beantwoord is; dit hoort geen vaste bewoner te worden.
 */
const AAN = process.env.TIMING !== "0";

// PromiseLike en niet Promise: de query-builder van Supabase is een thenable,
// geen echte Promise, en zou anders niet door deze helper heen passen.
export async function meet<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
  if (!AAN) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    console.log(`[timing] ${label} ${Math.round(performance.now() - start)}ms`);
  }
}

/** Voor stukken die geen eigen functie zijn: markeer begin en einde zelf. */
export function klok(label: string) {
  const start = performance.now();
  return () => {
    if (AAN) console.log(`[timing] ${label} ${Math.round(performance.now() - start)}ms`);
  };
}
