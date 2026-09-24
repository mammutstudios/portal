/**
 * Tijdelijk meetgereedschap.
 *
 * Schrijft weg naar de serverlog, waar Vercel het per aanroep bewaart. Bewust
 * niet naar een dienst of een tabel: dit staat er om één vraag te beantwoorden
 * (waar gaat de tijd heen op een pagina) en hoort er daarna weer uit.
 *
 * Aanzetten met METEN=1 in de omgeving. Staat die niet aan, dan doet `meet`
 * niets meer dan de functie uitvoeren, dus je kunt hem laten staan tot de
 * vraag beantwoord is zonder dat het iets kost.
 */
const AAN = process.env.METEN === "1";

// PromiseLike en niet Promise: een query van Supabase is een builder die je
// kunt awaiten, maar geen echte Promise. Met Promise<T> weigert TypeScript hem.
export async function meet<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
  if (!AAN) return fn();

  const begin = performance.now();
  try {
    return await fn();
  } finally {
    console.info(`[meet] ${label} ${Math.round(performance.now() - begin)}ms`);
  }
}
