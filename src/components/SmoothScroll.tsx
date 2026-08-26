"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Vloeiend scrollen in het contentvlak.
 *
 * Let op: het portaal scrollt niet in het venster maar in `.app-main`, dus Lenis
 * krijgt die container expliciet mee als wrapper. Zonder dat zou hij het
 * document afvangen en hier niets doen.
 *
 * Het element dat hij als inhoud krijgt moet blijven staan zolang de schil
 * staat. Lenis hangt er namelijk een ResizeObserver aan en meet alleen opnieuw
 * als die afgaat. Pakten we hier het eerste kind van `.app-main`, dan was dat de
 * pagina zelf, en die wisselt bij elke navigatie (en bij elk skelet uit
 * loading.tsx) van DOM-knoop. De observer keek dan naar een losgekoppeld
 * element dat nooit meer van maat verandert, dus bleef Lenis rekenen met de
 * hoogte van de vórige pagina. Op een langere pagina hield het scrollen daardoor
 * halverwege op, of lukte het helemaal niet. Vandaar `[data-scroll-content]`:
 * een vast omhulsel in de layout dat wél blijft staan.
 *
 * Respecteert `prefers-reduced-motion`: wie in het systeem heeft aangegeven
 * minder beweging te willen, houdt de native scroll.
 */
export default function SmoothScroll({ enabled = true }: { enabled?: boolean }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const wrapper = document.querySelector<HTMLElement>(".app-main");
    const content = wrapper?.querySelector<HTMLElement>("[data-scroll-content]");
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      // Licht gehouden: net genoeg om de sprong eruit te halen, zonder dat
      // snel scannen door een lange tabel traag gaat aanvoelen.
      duration: 0.5,
      easing: (t: number) => 1 - Math.pow(1 - t, 2),
      smoothWheel: true,
      // Op touch juist niet: daar is de native scroll beter.
      syncTouch: false,
    });
    lenisRef.current = lenis;

    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  // De observer hierboven is gedempt (250 ms) en gaat pas af als de nieuwe
  // pagina er staat. Bij een paginawissel meten we daarom meteen zelf, zodat de
  // eerste muisbeweging al met de juiste hoogte rekent.
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    const id = requestAnimationFrame(() => lenis.resize());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
