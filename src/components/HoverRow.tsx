"use client";

import { useRouter } from "next/navigation";

/**
 * Een tabelrij die in zijn geheel klikbaar is.
 *
 * Eerder deed een uitgerekte link dit werk: een ::after met `inset-0` over de
 * rij heen. Dat leunt op `position: relative` op de <tr>, en dat honoreert niet
 * elke schil. Waar het misgaat valt de link terug op het venster als houder, en
 * dan legt elke rij een laag over de hele pagina; de onderste rij ving zo elke
 * klik op het lege vlak op. Nu doet de rij het met een klikafhandelaar, net als
 * de tabellen op de andere pagina's.
 */
export default function HoverRow({
  href,
  children,
  style,
}: {
  href: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const router = useRouter();

  return (
    <tr
      className="cursor-pointer"
      style={style}
      // Een echte link of knop in de rij handelt zijn eigen klik af, zodat
      // cmd-klik en het toetsenbord blijven werken.
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        router.push(href);
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {children}
    </tr>
  );
}
