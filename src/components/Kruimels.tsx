"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AddressBook,
  Buildings,
  CaretRight,
  ChartBar,
  CheckSquare,
  Clock,
  CurrencyDollar,
  Folder,
  Funnel,
  Pulse as PulseIcon,
  SquaresFour,
} from "@phosphor-icons/react";

/**
 * Waar je bent, in de topbalk.
 *
 * De sectie komt uit het adres, de naam van het record uit de pagina zelf.
 * Dat tweede kan niet uit het adres: /dashboard/projects/<uuid> zegt niets
 * over hoe dat project heet. Vandaar deze context: een detailpagina rendert
 * <ZetKruimel label="DGA" /> en de balk pikt dat op.
 *
 * De balk en de pagina staan naast elkaar in de boom, dus de provider moet om
 * allebei heen. Die zit in de dashboard-layout.
 */
type Kruimel = { label: string; href?: string };

const KruimelContext = createContext<{
  extra: Kruimel[];
  zet: (sleutel: string, kruimels: Kruimel[]) => void;
  weg: (sleutel: string) => void;
}>({ extra: [], zet: () => {}, weg: () => {} });

export function KruimelProvider({ children }: { children: React.ReactNode }) {
  // Op sleutel en niet als losse lijst: bij een paginawissel staat de nieuwe
  // pagina er soms al voordat de oude is opgeruimd, en dan zou de verkeerde
  // naam blijven hangen.
  const [perSleutel, setPerSleutel] = useState<Record<string, Kruimel[]>>({});

  const waarde = useMemo(
    () => ({
      extra: Object.values(perSleutel)[0] ?? [],
      zet: (sleutel: string, kruimels: Kruimel[]) =>
        setPerSleutel({ [sleutel]: kruimels }),
      weg: (sleutel: string) =>
        setPerSleutel((h) => (sleutel in h ? {} : h)),
    }),
    [perSleutel],
  );

  return <KruimelContext.Provider value={waarde}>{children}</KruimelContext.Provider>;
}

/**
 * Meldt de naam van dit record aan de topbalk.
 *
 * Rendert zelf niets. Een detailpagina zet hem bovenaan neer met de titel die
 * hij toch al had opgehaald.
 */
export function ZetKruimel({ label, href }: { label: string; href?: string }) {
  const { zet, weg } = useContext(KruimelContext);
  const sleutel = `${label}|${href ?? ""}`;

  useEffect(() => {
    zet(sleutel, [{ label, href }]);
    return () => weg(sleutel);
    // zet en weg wisselen bij elke render van de provider; alleen de inhoud
    // van deze kruimel bepaalt of er iets te melden valt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleutel]);

  return null;
}

const SECTIES: { pad: string; label: string; icoon: React.ReactNode }[] = [
  { pad: "/dashboard/tasks", label: "Tasks", icoon: <CheckSquare size={15} weight="fill" /> },
  { pad: "/dashboard/projects", label: "Projects", icoon: <Folder size={15} weight="fill" /> },
  { pad: "/dashboard/deals", label: "Deals", icoon: <Funnel size={15} weight="fill" /> },
  { pad: "/dashboard/toggl", label: "Time", icoon: <Clock size={15} weight="fill" /> },
  { pad: "/dashboard/analytics", label: "Analytics", icoon: <ChartBar size={15} weight="fill" /> },
  { pad: "/dashboard/finance", label: "Finance", icoon: <CurrencyDollar size={15} weight="bold" /> },
  { pad: "/dashboard/clients", label: "Organisaties", icoon: <Buildings size={15} weight="fill" /> },
  { pad: "/dashboard/contacts", label: "Contactpersonen", icoon: <AddressBook size={15} weight="fill" /> },
  { pad: "/dashboard/activiteiten", label: "Activiteiten", icoon: <PulseIcon size={15} weight="fill" /> },
  { pad: "/dashboard/settings", label: "Instellingen", icoon: <SquaresFour size={15} weight="fill" /> },
  // Als laatste, want elk pad hierboven begint er ook mee.
  { pad: "/dashboard", label: "Overzicht", icoon: <SquaresFour size={15} weight="fill" /> },
];

/** Laatste stukje van het adres, als het een woord is en geen id. */
const STAARTEN: Record<string, string> = {
  nieuw: "Nieuw",
  bewerken: "Bewerken",
  facturen: "Facturen",
  periodiek: "Periodiek",
  transactions: "Transacties",
};

export default function Kruimels() {
  const pathname = usePathname();
  const { extra } = useContext(KruimelContext);
  if (!pathname) return null;

  const sectie = SECTIES.find((s) => pathname === s.pad || pathname.startsWith(`${s.pad}/`));
  if (!sectie) return null;

  const rest = pathname.slice(sectie.pad.length).split("/").filter(Boolean);
  const staart = rest.length > 0 ? STAARTEN[rest[rest.length - 1]] : undefined;

  // Wat de pagina meldt gaat voor: die kent de naam, het adres niet.
  const verder: Kruimel[] = extra.length > 0 ? extra : staart ? [{ label: staart }] : [];

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0" style={{ color: "var(--text-muted)" }}>
      <Link
        href={sectie.pad}
        className="flex items-center gap-1.5 min-w-0 rounded-md px-1.5 py-1"
        style={{
          color: verder.length > 0 ? "var(--text-muted)" : "var(--text-heading)",
          transition: "background 120ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      >
        {sectie.icoon}
        <span className="truncate">{sectie.label}</span>
      </Link>

      {verder.map((kruimel, i) => (
        <span key={`${kruimel.label}-${i}`} className="flex items-center gap-1 min-w-0">
          <CaretRight size={12} weight="bold" className="flex-shrink-0" />
          {kruimel.href ? (
            <Link
              href={kruimel.href}
              className="truncate rounded-md px-1.5 py-1"
              style={{ color: "var(--text-heading)" }}
            >
              {kruimel.label}
            </Link>
          ) : (
            <span className="truncate px-1.5" style={{ color: "var(--text-heading)" }}>
              {kruimel.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
