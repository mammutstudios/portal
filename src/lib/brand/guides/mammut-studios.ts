import type { BrandGuide } from "../types";

/**
 * De huisstijl van Mammut Studios zelf, en meteen het voorbeeld waar een gids
 * voor een klant op gebaseerd kan worden. De waarden komen 1:1 uit
 * mammutstudios.com en `globals.css`, zodat de gids niet uit de pas gaat lopen
 * met wat er werkelijk staat.
 */
const guide: BrandGuide = {
  clientSlug: "mammut-studios",
  brandName: "Mammut Studios",
  tagline: "Websites die blijven staan.",
  updatedAt: "2026-08-24",

  intro: {
    body: [
      "Deze pagina is de bron voor alles wat het merk zichtbaar maakt: het logo, de kleuren, de letter en de manier waarop dingen bewegen. Wie iets maakt voor Mammut Studios, van een advertentie tot een presentatie, vindt hier de waarden om over te nemen.",
      "Klik op een kleur of een waarde om die te kopiëren. De pagina is altijd de actuele versie, dus bewaar geen losse kopie.",
    ],
    values: [
      {
        title: "Rustig",
        body: "Veel wit, één accent, geen versiering die niets doet. Wat overblijft is de inhoud.",
      },
      {
        title: "Degelijk",
        body: "Zware letters, stevige vlakken, zachte hoeken. Het merk hoort solide aan te voelen, niet luchtig.",
      },
      {
        title: "In beweging",
        body: "Alles wat verschuift doet dat met dezelfde curve. Beweging is er om richting te geven, niet om op te vallen.",
      },
    ],
  },

  logos: {
    intro:
      "Het woordmerk is de standaard. Het beeldmerk gebruiken we alleen waar de ruimte vierkant is: een favicon, een profielfoto, een app-icoon.",
    variants: [
      {
        name: "Woordmerk, ink",
        src: "/brand/mammut-studios/mammut-woordmerk-ink.svg",
        width: "13rem",
        usage: "Op wit en op lichte vlakken.",
        downloads: [
          { name: "Woordmerk ink", href: "/brand/mammut-studios/mammut-woordmerk-ink.svg", format: "SVG" },
        ],
      },
      {
        name: "Woordmerk, wit",
        src: "/brand/mammut-studios/mammut-woordmerk-wit.svg",
        background: "#140018",
        width: "13rem",
        usage: "Op ink en op foto's die donker genoeg zijn.",
        downloads: [
          { name: "Woordmerk wit", href: "/brand/mammut-studios/mammut-woordmerk-wit.svg", format: "SVG" },
        ],
      },
      {
        name: "Beeldmerk",
        src: "/brand/mammut-studios/mammut-beeldmerk.svg",
        width: "5.5rem",
        usage: "Vierkante plekken: favicon, avatar, app-icoon.",
        downloads: [
          { name: "Beeldmerk", href: "/brand/mammut-studios/mammut-beeldmerk.svg", format: "SVG" },
        ],
      },
    ],
    rules: {
      do: [
        "Gebruik het SVG-bestand, zodat het logo op elk formaat scherp blijft.",
        "Houd rondom minstens de hoogte van de mammoet vrij.",
        "Zet het woordmerk op een vlak met genoeg contrast: ink op licht, wit op donker.",
      ],
      dont: [
        "Het logo uitrekken, kantelen of van een schaduw voorzien.",
        "De kleuren vervangen door iets buiten het palet.",
        "Het woordmerk kleiner zetten dan 88 pixels breed; dan valt de mammoet uit elkaar.",
      ],
    },
    notes: [
      "Vrije ruimte: minimaal de hoogte van de mammoet rondom het merk.",
      "Minimale breedte: 88 pixels op scherm, 25 millimeter in druk.",
    ],
  },

  colors: {
    intro:
      "Ink draagt het merk, de lavendeltinten zijn accentvlakken. Gebruik de lichte tinten voor grote vlakken en houd de ink voor tekst, lijnen en knoppen.",
    groups: [
      {
        title: "Basis",
        colors: [
          { name: "Ink", hex: "#140018", usage: "Tekst, knoppen, het logo." },
          { name: "Wit", hex: "#FFFFFF", usage: "Achtergrond van kaarten en pagina's." },
          { name: "Muted", hex: "#645D73", usage: "Bijschriften en secundaire tekst." },
        ],
      },
      {
        title: "Lavendel",
        description: "Accentvlakken, van donker naar licht. Nooit als tekstkleur.",
        colors: [
          { name: "Lavender", hex: "#DBE8FB", usage: "Het beeldmerk en grote accentvlakken." },
          { name: "Lighter", hex: "#E7F0FD", usage: "Secties die zich van wit moeten onderscheiden." },
          { name: "Lightest", hex: "#F4F8FE", usage: "De rustigste tint, voor brede banen." },
        ],
      },
      {
        title: "Werkblad",
        description: "Alleen in het portaal en het dashboard, bewust warmer dan de site.",
        colors: [{ name: "Canvas", hex: "#FAFAF9", usage: "Het vlak achter de kaarten." }],
      },
    ],
  },

  typography: {
    intro:
      "PP Mori in drie gewichten. Koppen staan in Extrabold, tussenkoppen in Semibold, lopende tekst in Medium.",
    sample: "Wij bouwen websites die blijven staan.",
    fonts: [
      {
        name: "PP Mori",
        stack: '"PP Mori", -apple-system, BlinkMacSystemFont, sans-serif',
        weights: [
          { label: "Medium", value: 400 },
          { label: "Semibold", value: 600 },
          { label: "Extrabold", value: 800 },
        ],
        usage: "De enige letter van het merk, voor kop en tekst.",
        source: { label: "Pangram Pangram", href: "https://pangrampangram.com/products/mori" },
      },
    ],
    scale: [
      { label: "Kop 1", size: "3rem", lineHeight: "1.1", weight: 800, letterSpacing: "-0.02em", usage: "Eén per pagina." },
      { label: "Kop 2", size: "1.875rem", lineHeight: "1.2", weight: 800, usage: "Sectiekoppen." },
      { label: "Kop 3", size: "1.25rem", lineHeight: "1.3", weight: 600, usage: "Kaarten en blokken." },
      { label: "Tekst", size: "1.125rem", lineHeight: "1.6", weight: 400, usage: "Lopende tekst." },
      { label: "Klein", size: "0.875rem", lineHeight: "1.5", weight: 400, usage: "Bijschriften en tabellen." },
    ],
  },

  motion: {
    intro:
      "Eén curve voor alles wat verplaatst, en korte tijden voor alles wat alleen van kleur wisselt. Beweeg over een afstand die past bij de duur: hoe verder, hoe langer.",
    items: [
      {
        name: "Osmo",
        easing: "cubic-bezier(0.625, 0.05, 0, 1)",
        duration: 600,
        usage: "Binnenkomen, uitschuiven, alles wat een afstand aflegt.",
      },
      {
        name: "Hover",
        easing: "ease",
        duration: 150,
        usage: "Kleur en achtergrond onder de muis.",
      },
      {
        name: "Paneel",
        easing: "cubic-bezier(0.625, 0.05, 0, 1)",
        duration: 200,
        usage: "Menu's en lades die open en dicht schuiven.",
      },
    ],
  },

  social: {
    intro: "Op elk kanaal staat het beeldmerk als profielfoto, op ink.",
    items: [
      {
        platform: "Instagram",
        handle: "@mammutstudios",
        href: "https://instagram.com/mammutstudios",
        guidance: "Vierkant of 4:5. Werk in beeld, tekst zo kort mogelijk.",
      },
      {
        platform: "LinkedIn",
        handle: "Mammut Studios",
        href: "https://www.linkedin.com/company/mammutstudios",
        guidance: "Liggend 1.91:1. Toon opgeleverd werk en wat het opleverde.",
      },
    ],
  },

  assets: {
    intro: "De bestanden zelf, om te downloaden.",
    items: [
      { name: "Woordmerk, ink", href: "/brand/mammut-studios/mammut-woordmerk-ink.svg", format: "SVG" },
      { name: "Woordmerk, wit", href: "/brand/mammut-studios/mammut-woordmerk-wit.svg", format: "SVG" },
      { name: "Beeldmerk", href: "/brand/mammut-studios/mammut-beeldmerk.svg", format: "SVG" },
      { name: "PP Mori Medium", href: "/fonts/PPMori-Medium.woff2", format: "WOFF2" },
      { name: "PP Mori Semibold", href: "/fonts/PPMori-Semibold.woff2", format: "WOFF2" },
      { name: "PP Mori Extrabold", href: "/fonts/PPMori-Extrabold.woff2", format: "WOFF2" },
    ],
  },
};

export default guide;
