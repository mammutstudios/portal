/**
 * De vorm van een huisstijlgids.
 *
 * Een gids is een databestand in `src/lib/brand/guides/<slug>.ts`, waarbij de
 * slug gelijk is aan `clients.slug` in Supabase. Zo hoeft er niets in de
 * database bij te komen en staat de inhoud in versiebeheer, met als prijs dat
 * een wijziging een deploy vraagt.
 *
 * Alle secties zijn optioneel: wat ontbreekt wordt niet getoond. Zo kan een
 * gids klein beginnen (alleen logo en kleur) en later aangroeien.
 */

export type BrandColor = {
  name: string;
  /** Zes cijfers met hekje, bijvoorbeeld "#140018". */
  hex: string;
  /** Waar de kleur voor bedoeld is; staat onder de naam in de staal. */
  usage?: string;
  /** Extra waarden die de klant kan overnemen, bijvoorbeeld Pantone of CMYK. */
  extra?: { label: string; value: string }[];
};

export type BrandColorGroup = {
  title: string;
  description?: string;
  colors: BrandColor[];
};

export type BrandFont = {
  name: string;
  /** De font-family waarmee het voorbeeld op het scherm wordt gezet. Laat de
   *  eigen letter voorop staan en zet er een systeemletter achter, anders
   *  valt het voorbeeld terug op iets willekeurigs. */
  stack: string;
  /** Gewichten die tot de huisstijl horen, in de volgorde van licht naar zwaar. */
  weights?: { label: string; value: number }[];
  usage?: string;
  /** Waar de letter vandaan komt: foundry, Google Fonts, of een eigen licentie. */
  source?: { label: string; href?: string };
};

export type BrandTypeStyle = {
  /** Bijvoorbeeld "Kop 1" of "Body". */
  label: string;
  /** Als CSS-waarde, zodat het voorbeeld klopt: "3rem", "18px". */
  size: string;
  lineHeight?: string;
  weight?: number;
  letterSpacing?: string;
  /** Font-family als deze stijl van de basisletter afwijkt. */
  font?: string;
  usage?: string;
};

export type BrandLogo = {
  name: string;
  /** Pad in /public of een externe URL. SVG heeft de voorkeur: die blijft
   *  scherp in het voorbeeld én is meteen het bestand om te downloaden. */
  src: string;
  /** Vlak waarop deze variant hoort te staan. Standaard het witte werkblad. */
  background?: string;
  /** Maximale breedte van het voorbeeld, als CSS-waarde. */
  width?: string;
  usage?: string;
  downloads?: BrandAsset[];
};

export type BrandMotion = {
  name: string;
  /** Volledige CSS-waarde, bijvoorbeeld "cubic-bezier(.625,.05,0,1)". */
  easing: string;
  /** In milliseconden. */
  duration: number;
  usage?: string;
};

export type BrandAsset = {
  name: string;
  /** Pad of URL. Wordt als download aangeboden. */
  href: string;
  /** Bijvoorbeeld "SVG" of "PNG, 2000px". */
  format?: string;
  description?: string;
};

export type BrandSocial = {
  platform: string;
  handle?: string;
  href?: string;
  /** Wat er op dit kanaal geldt: formaten, toon, wat wel en niet. */
  guidance?: string;
};

export type BrandApplication = {
  name: string;
  description?: string;
  /** Afbeelding van de toepassing; zonder afbeelding blijft het een tekstkaart. */
  image?: string;
};

export type BrandGuide = {
  /** Gelijk aan `clients.slug`. Hiermee vindt het portaal de juiste gids. */
  clientSlug: string;
  brandName: string;
  tagline?: string;
  /** Datum in ISO-vorm; staat als "Bijgewerkt op" boven aan de pagina. */
  updatedAt: string;

  intro?: {
    body: string[];
    /** Kernwaarden of merkpijlers, als kaartjes onder de tekst. */
    values?: { title: string; body: string }[];
  };

  logos?: {
    intro?: string;
    variants: BrandLogo[];
    /** Regels voor gebruik. Beide lijsten zijn los optioneel. */
    rules?: { do?: string[]; dont?: string[] };
    /** Bijvoorbeeld over vrije ruimte en minimale afmeting. */
    notes?: string[];
  };

  colors?: {
    intro?: string;
    groups: BrandColorGroup[];
  };

  typography?: {
    intro?: string;
    fonts: BrandFont[];
    scale?: BrandTypeStyle[];
    /** Voorbeeldzin in de proefregels. Zonder waarde een pangram. */
    sample?: string;
  };

  motion?: {
    intro?: string;
    items: BrandMotion[];
  };

  applications?: {
    intro?: string;
    items: BrandApplication[];
  };

  social?: {
    intro?: string;
    items: BrandSocial[];
  };

  assets?: {
    intro?: string;
    items: BrandAsset[];
  };
};

/**
 * Is dit een donkere kleur? Bepaalt of de naam op een staal wit of ink wordt.
 *
 * Gewogen helderheid volgens de vuistregel van WCAG, niet het gemiddelde van
 * de drie kanalen: puur groen is voor het oog veel lichter dan puur blauw.
 */
export function isDarkHex(hex: string): boolean {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6;
}
