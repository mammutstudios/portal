import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClientLogo from "@/components/ClientLogo";
import PageSkeleton from "@/components/PageSkeleton";
import {
  beschrijf,
  linkVoor,
  wijzigingenVan,
  zinVoorWijziging,
  type Activity,
} from "@/lib/activity";

/** Hoeveel regels de pagina laat zien. Genoeg om terug te kijken, niet eindeloos. */
const LIMIET = 150;

export default function ActiviteitenPage() {
  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Activiteiten
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Wat er in het portaal is gebeurd, nieuwste eerst.
      </p>

      <Suspense fallback={<PageSkeleton rijen={6} kaal />}>
        <Lijst />
      </Suspense>
    </div>
  );
}

async function Lijst() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select(
      "id, created_at, action, entity_type, entity_id, entity_label, client_id, meta, profiles:actor_profile_id(full_name, avatar_url)",
    )
    .order("created_at", { ascending: false })
    .limit(LIMIET);

  // De tabel bestaat pas na de migratie; tot die tijd geen foutscherm maar uitleg.
  if (error) {
    return (
      <Kader>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Het log is nog niet aangezet. Draai de migratie
          <code className="mx-1 px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--bg-secondary)" }}>
            20260825_activiteiten.sql
          </code>
          in Supabase.
        </p>
      </Kader>
    );
  }

  const regels = (data ?? []) as unknown as Activity[];

  if (regels.length === 0) {
    return (
      <Kader>
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
          Nog niets vastgelegd. Zodra er iets is gebeurd verschijnt het hier.
        </p>
      </Kader>
    );
  }

  // Per dag groeperen; een lange lijst zonder koppen leest niet.
  const perDag = new Map<string, Activity[]>();
  for (const r of regels) {
    const dag = r.created_at.slice(0, 10);
    const bestaand = perDag.get(dag);
    if (bestaand) bestaand.push(r);
    else perDag.set(dag, [r]);
  }

  return (
    <div className="space-y-8">
      {[...perDag.entries()].map(([dag, vanDieDag]) => (
        <section key={dag}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-heading)" }}>
            {dagLabel(dag)}
          </h2>
          <Kader plat>
            {vanDieDag.map((a, i) => (
              <Regel key={a.id} activiteit={a} laatste={i === vanDieDag.length - 1} />
            ))}
          </Kader>
        </section>
      ))}
    </div>
  );
}

function Regel({ activiteit, laatste }: { activiteit: Activity; laatste: boolean }) {
  const naam = activiteit.profiles?.full_name ?? "Systeem";
  const href = linkVoor(activiteit);
  // Eén wijziging staat al in de zin; vanaf twee komen ze eronder te staan.
  const wijzigingen = wijzigingenVan(activiteit);
  const detail = wijzigingen.length > 1 ? wijzigingen : [];

  const inhoud = (
    <>
      <ClientLogo logo_url={activiteit.profiles?.avatar_url ?? null} name={naam} />
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: "var(--text)" }}>
          <span className="font-medium" style={{ color: "var(--text-heading)" }}>{naam}</span>{" "}
          {beschrijf(activiteit)}
        </p>
        {detail.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {detail.map((w) => (
              <li key={w.veld} className="text-xs" style={{ color: "var(--text-muted)" }}>
                {zinVoorWijziging(w)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <span className="text-xs tabular-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>
        {tijd(activiteit.created_at)}
      </span>
    </>
  );

  const klassen = `flex gap-3 px-4 py-3 ${detail.length > 0 ? "items-start" : "items-center"}`;
  const stijl = { borderBottom: laatste ? "none" : "1px solid var(--border)" };

  return href ? (
    <Link href={href} className={`card-hover ${klassen}`} style={stijl}>
      {inhoud}
    </Link>
  ) : (
    <div className={klassen} style={stijl}>
      {inhoud}
    </div>
  );
}

function Kader({ children, plat = false }: { children: React.ReactNode; plat?: boolean }) {
  return (
    <div
      className={`squircle ${plat ? "overflow-hidden" : "px-4 py-6"}`}
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {children}
    </div>
  );
}

/** Vandaag en gisteren bij naam, de rest als datum. */
function dagLabel(dag: string): string {
  const nu = new Date();
  const vandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate());
  const dat = new Date(`${dag}T00:00:00`);
  const verschil = Math.round((vandaag.getTime() - dat.getTime()) / 86_400_000);

  if (verschil === 0) return "Vandaag";
  if (verschil === 1) return "Gisteren";
  const l = dat.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  return l.charAt(0).toUpperCase() + l.slice(1);
}

const tijd = (iso: string) =>
  new Date(iso).toLocaleTimeString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
  });
