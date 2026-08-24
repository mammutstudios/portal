"use client";

import { useEffect, useState } from "react";

export type BrandSection = { id: string; label: string };

/**
 * De secties van de gids, meelopend met waar je bent.
 *
 * Blijft plakken aan de bovenkant van het contentvlak. De sectie die actief is
 * wordt bepaald met een IntersectionObserver: de bovenste sectie die op dat
 * moment in beeld staat wint, zodat de markering niet heen en weer springt bij
 * een korte sectie.
 */
export default function SectionNav({ sections }: { sections: BrandSection[] }) {
  const [actief, setActief] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const zichtbaar = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) zichtbaar.add(entry.target.id);
          else zichtbaar.delete(entry.target.id);
        }
        const eerste = sections.find((s) => zichtbaar.has(s.id));
        if (eerste) setActief(eerste.id);
      },
      // De band ligt in de bovenste helft: een sectie telt pas als hij echt
      // gelezen wordt, niet als hij onderin net binnenkomt.
      { rootMargin: "-15% 0px -55% 0px" },
    );

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      className="sticky top-0 z-20 -mx-4 md:-mx-10 px-4 md:px-10 mb-8"
      style={{ background: "var(--canvas)", borderBottom: "1px solid var(--border)" }}
    >
      <ul className="flex gap-1 overflow-x-auto py-2" style={{ scrollbarWidth: "none" }}>
        {sections.map((s) => {
          const aan = s.id === actief;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm"
                style={{
                  background: aan ? "var(--bg-hover)" : "transparent",
                  color: aan ? "var(--text-heading)" : "var(--text-muted)",
                  fontWeight: aan ? 600 : 400,
                  transition: "background 150ms var(--ease-osmo), color 150ms var(--ease-osmo)",
                }}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
