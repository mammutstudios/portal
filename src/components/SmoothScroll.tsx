"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Vloeiend scrollen in het contentvlak.
 *
 * Let op: het portaal scrollt niet in het venster maar in `.app-main`, dus Lenis
 * krijgt die container expliciet mee als wrapper. Zonder dat zou hij het
 * document afvangen en hier niets doen.
 *
 * Respecteert `prefers-reduced-motion`: wie in het systeem heeft aangegeven
 * minder beweging te willen, houdt de native scroll.
 */
export default function SmoothScroll({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const wrapper = document.querySelector<HTMLElement>(".app-main");
    const content = wrapper?.firstElementChild as HTMLElement | null;
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

    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
