import type { MetadataRoute } from "next";

/**
 * Voor het portaal als app in het Dock.
 *
 * Zonder dit bestand pakt de browser bij het toevoegen aan het Dock de
 * apple-touch-icon en verzint hij de rest. Met een manifest staat vast welk
 * icoon hij neemt en welke kleur de titelbalk krijgt.
 *
 * Let op: een app die al in het Dock staat onthoudt zijn icoon van het moment
 * van toevoegen. Verandert het icoon, dan moet hij er opnieuw in.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mammut Portal",
    short_name: "Mammut",
    description: "Mammut Studios client portal",
    start_url: "/dashboard",
    display: "standalone",
    // De tint van de zijbalk, niet wit: in de desktop-app kleurt dit de balk
    // waar de drie knopjes in staan, en die hoort bij de navigatie eronder.
    theme_color: "#f8f7f8",
    background_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
