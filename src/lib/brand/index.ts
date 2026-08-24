import type { BrandGuide } from "./types";
import mammutStudios from "./guides/mammut-studios";

/**
 * Het register van huisstijlgidsen.
 *
 * Een nieuwe klant erbij: maak `guides/<slug>.ts` naar het voorbeeld van
 * `mammut-studios.ts` en zet hem in deze lijst. De slug moet gelijk zijn aan
 * `clients.slug`, want daarop zoekt het portaal.
 */
const GUIDES: BrandGuide[] = [mammutStudios];

const BY_SLUG = new Map(GUIDES.map((g) => [g.clientSlug, g]));

export function getBrandGuide(slug: string | null | undefined): BrandGuide | null {
  return slug ? BY_SLUG.get(slug) ?? null : null;
}

export function hasBrandGuide(slug: string | null | undefined): boolean {
  return getBrandGuide(slug) !== null;
}

/**
 * De eerste gids die bij deze bezoeker hoort.
 *
 * Iemand kan aan meerdere klanten gekoppeld zijn (een bureau bijvoorbeeld),
 * maar de meesten aan één. `voorkeur` is de klant die actief is in het
 * portaal; die wint als er een gids voor bestaat.
 */
export function findBrandGuide(
  slugs: (string | null | undefined)[],
  voorkeur?: string | null,
): BrandGuide | null {
  return getBrandGuide(voorkeur) ?? slugs.map(getBrandGuide).find(Boolean) ?? null;
}

export type { BrandGuide } from "./types";
