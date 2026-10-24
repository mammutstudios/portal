"use client";

import { useMemo, useState } from "react";
import { CaretLeft, CaretRight, CaretDown } from "@phosphor-icons/react";
import ClientLogo from "@/components/ClientLogo";
import { kleurVan } from "@/components/TimeWeek";
import type { TimeEntry, Profile } from "@/lib/types";

const DAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];
/** Hoog genoeg om verschil te zien, laag genoeg om de uitsplitsing erbij in
    beeld te houden zonder te scrollen. */
const STAAF_HOOGTE = 132;

/**
 * Waar de tijd heen ging.
 *
 * Het weekrooster laat zien hoe een dag eruitzag; dit laat zien wat eruit
 * kwam. Per dag een staaf, en daaronder de uitsplitsing per klant en project,
 * want dat is de vraag die je stelt aan het eind van een week: zat ik waar ik
 * dacht te zitten.
 *
 * Alles wordt hier uitgerekend uit dezelfde regels die de andere twee
 * weergaven ook krijgen. Geen eigen query, dus wisselen van weergave kost
 * niets.
 */
export default function TimeOverzicht({
  entries,
  profiles,
  currentUserId,
  rechts,
}: {
  entries: TimeEntry[];
  profiles: Pick<Profile, "id" | "full_name" | "avatar_url">[];
  currentUserId: string | null;
  /** De wissel tussen de weergaven; die hoort in dezelfde balk. */
  rechts?: React.ReactNode;
}) {
  const [soort, setSoort] = useState<"week" | "maand">("week");
  const [anker, setAnker] = useState(() => maandagVan(new Date()));
  const [wie, setWie] = useState<string | null>(currentUserId);
  const [dicht, setDicht] = useState<Set<string>>(new Set());

  const dagen = useMemo(() => reeks(anker, soort), [anker, soort]);

  const vanWie = useMemo(
    () => (wie ? entries.filter((e) => e.profile_id === wie) : entries),
    [entries, wie],
  );

  const inPeriode = useMemo(() => {
    const van = isoDag(dagen[0]);
    const tot = isoDag(dagen[dagen.length - 1]);
    return vanWie.filter((e) => {
      const d = dagVan(e);
      return d >= van && d <= tot;
    });
  }, [vanWie, dagen]);

  const totaal = inPeriode.reduce((som, e) => som + Number(e.hours), 0);

  const perDag = useMemo(() => {
    const uit = new Map<string, number>();
    for (const e of inPeriode) uit.set(dagVan(e), (uit.get(dagVan(e)) ?? 0) + Number(e.hours));
    return uit;
  }, [inPeriode]);

  const hoogste = Math.max(1, ...dagen.map((d) => perDag.get(isoDag(d)) ?? 0));
  const gewerkteDagen = dagen.filter((d) => (perDag.get(isoDag(d)) ?? 0) > 0).length;

  /** Per project, met de regels eronder. Gesorteerd op uren, want de grootste
      post is waar je naar kijkt. */
  const groepen = useMemo(() => {
    const kaart = new Map<string, Groep>();
    for (const e of inPeriode) {
      const sleutel = e.project_id ?? "los";
      const bestaand = kaart.get(sleutel);
      const groep: Groep =
        bestaand ??
        {
          sleutel,
          project: e.projects?.title ?? "Zonder project",
          klant: e.projects?.clients?.name ?? null,
          logo: e.projects?.clients?.logo_url ?? null,
          uren: 0,
          regels: new Map<string, number>(),
        };
      groep.uren += Number(e.hours);
      // Let op het verschil met ??: een lege omschrijving is een string en
      // komt daar ongemerkt doorheen, en dan staat er een regel zonder naam.
      const label = e.tasks?.title || e.task || "Zonder omschrijving";
      groep.regels.set(label, (groep.regels.get(label) ?? 0) + Number(e.hours));
      kaart.set(sleutel, groep);
    }
    return [...kaart.values()].sort((a, b) => b.uren - a.uren);
  }, [inPeriode]);

  const perPersoon = useMemo(() => {
    if (wie) return [];
    const kaart = new Map<string, number>();
    for (const e of inPeriode) {
      const k = e.profile_id ?? "onbekend";
      kaart.set(k, (kaart.get(k) ?? 0) + Number(e.hours));
    }
    return [...kaart.entries()]
      .map(([id, uren]) => ({
        id,
        naam: profiles.find((p) => p.id === id)?.full_name ?? "Onbekend",
        avatar: profiles.find((p) => p.id === id)?.avatar_url ?? null,
        uren,
      }))
      .sort((a, b) => b.uren - a.uren);
  }, [inPeriode, profiles, wie]);

  function schuif(richting: number) {
    setAnker((huidig) =>
      soort === "week"
        ? dagErbij(huidig, 7 * richting)
        : new Date(huidig.getFullYear(), huidig.getMonth() + richting, 1),
    );
  }

  function nu() {
    setAnker(soort === "week" ? maandagVan(new Date()) : eersteVan(new Date()));
  }

  function wisselSoort(nieuw: "week" | "maand") {
    setSoort(nieuw);
    setAnker(nieuw === "week" ? maandagVan(anker) : eersteVan(anker));
  }

  function klap(sleutel: string) {
    setDicht((oud) => {
      const nieuw = new Set(oud);
      if (nieuw.has(sleutel)) nieuw.delete(sleutel);
      else nieuw.add(sleutel);
      return nieuw;
    });
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 48px)" }}>
      <div className="flex items-center gap-3 px-4 md:px-6 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center" style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
          <Knopje onClick={() => schuif(-1)} label="Vorige">
            <CaretLeft size={14} weight="bold" />
          </Knopje>
          <button
            type="button"
            onClick={nu}
            className="text-xs font-medium px-2.5 whitespace-nowrap"
            style={{ height: 30, color: "var(--text-heading)" }}
          >
            {soort === "week" ? weekLabel(anker) : maandLabel(anker)}
          </button>
          <Knopje onClick={() => schuif(1)} label="Volgende">
            <CaretRight size={14} weight="bold" />
          </Knopje>
        </div>

        <div className="flex overflow-hidden rounded-md" style={{ border: "1px solid var(--border)", height: 30 }}>
          {(["week", "maand"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={soort === s}
              onClick={() => wisselSoort(s)}
              className="text-xs font-medium px-2.5 capitalize"
              style={{
                background: soort === s ? "var(--bg-hover)" : "none",
                color: soort === s ? "var(--text-heading)" : "var(--text-muted)",
                opacity: soort === s ? 1 : 0.6,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-xs whitespace-nowrap truncate" style={{ color: "var(--text-muted)" }}>
          Totaal <strong style={{ color: "var(--text-heading)" }}>{urenTekst(totaal)}</strong>
          {gewerkteDagen > 0 && (
            <>
              {" "}· {gewerkteDagen} {gewerkteDagen === 1 ? "dag" : "dagen"} ·{" "}
              gemiddeld {urenTekst(totaal / gewerkteDagen)}
            </>
          )}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {profiles.length > 1 && (
            <select
              value={wie ?? ""}
              onChange={(e) => setWie(e.target.value || null)}
              className="text-xs px-2 rounded-md"
              style={{ height: 30, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-heading)" }}
            >
              <option value="">Iedereen</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name ?? "Onbekend"}</option>
              ))}
            </select>
          )}
          {rechts}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-10">
        {/* De staven. Eén per dag, en de hoogte is de uitkomst gedeeld door de
            hoogste dag: een vaste schaal in uren zou bij een rustige week
            alleen maar lege ruimte tonen. */}
        <div
          className="squircle px-4 pt-4 pb-3 mb-5"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        >
          <div className="flex items-end gap-1" style={{ height: STAAF_HOOGTE }}>
            {dagen.map((d) => {
              const uren = perDag.get(isoDag(d)) ?? 0;
              return (
                <div key={isoDag(d)} className="flex-1 flex flex-col justify-end items-center gap-1 h-full">
                  {uren > 0 && (
                    <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {soort === "week" ? urenTekst(uren) : ""}
                    </span>
                  )}
                  <div
                    title={`${d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}: ${urenTekst(uren)}`}
                    className="rounded-t"
                    style={{
                      // Niet de hele kolom breed: dan is het een vlak en geen
                      // staaf, en bij één gewerkte dag las het als een blok.
                      width: "min(100%, 44px)",
                      height: uren > 0 ? Math.max(3, (uren / hoogste) * (STAAF_HOOGTE - 22)) : 2,
                      background: uren > 0 ? "var(--ink)" : "var(--border)",
                      opacity: uren > 0 ? (vandaag(d) ? 1 : 0.75) : 1,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-1.5">
            {dagen.map((d) => (
              <div key={isoDag(d)} className="flex-1 text-center">
                <span
                  className="text-xs"
                  style={{
                    color: vandaag(d) ? "var(--text-heading)" : "var(--text-muted)",
                    fontWeight: vandaag(d) ? 600 : 400,
                  }}
                >
                  {soort === "week" ? `${DAGEN[(d.getDay() + 6) % 7]} ${d.getDate()}` : d.getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* De uitsplitsing. Per project, omdat dat is wat op een factuur komt;
            de omschrijvingen eronder zeggen waar het aan opging. */}
        {groepen.length > 0 ? (
          <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
            {groepen.map((g, i) => {
              const tint = kleurVan(g.sleutel === "los" ? null : g.sleutel);
              const deel = totaal > 0 ? g.uren / totaal : 0;
              const open = !dicht.has(g.sleutel);
              return (
                <div key={g.sleutel} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                  <button
                    type="button"
                    onClick={() => klap(g.sleutel)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left card-hover"
                  >
                    <CaretDown
                      size={12}
                      weight="bold"
                      style={{
                        color: "var(--text-muted)",
                        transform: open ? "none" : "rotate(-90deg)",
                        transition: "transform 150ms",
                        flexShrink: 0,
                      }}
                    />
                    {g.klant ? (
                      <ClientLogo logo_url={g.logo} name={g.klant} />
                    ) : (
                      <span
                        aria-hidden
                        className="rounded-full flex-shrink-0"
                        style={{ width: 8, height: 8, margin: "0 6px", background: tint.rand }}
                      />
                    )}
                    <span className="text-sm font-medium truncate" style={{ color: "var(--text-heading)" }}>
                      {g.project}
                    </span>
                    {g.klant && (
                      <span className="text-xs truncate hidden md:inline" style={{ color: "var(--text-muted)" }}>
                        {g.klant}
                      </span>
                    )}

                    {/* De balk zegt in één oogopslag hoe de week verdeeld was;
                        het getal erachter zegt het precies. */}
                    <span className="ml-auto flex items-center gap-3 flex-shrink-0">
                      <span className="hidden sm:block rounded-full overflow-hidden" style={{ width: 140, height: 5, background: "var(--bg-secondary)" }}>
                        <span className="block h-full rounded-full" style={{ width: `${deel * 100}%`, background: tint.rand }} />
                      </span>
                      <span className="text-xs tabular-nums w-9 text-right" style={{ color: "var(--text-muted)" }}>
                        {Math.round(deel * 100)}%
                      </span>
                      <span className="text-sm tabular-nums font-medium w-12 text-right" style={{ color: "var(--text-heading)" }}>
                        {urenTekst(g.uren)}
                      </span>
                    </span>
                  </button>

                  {open && (
                    <div className="pb-1.5">
                      {[...g.regels.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, uren]) => (
                          <div key={label} className="flex items-center gap-3 pl-12 pr-4 py-1">
                            <span className="text-sm truncate" style={{ color: "var(--text)" }}>{label}</span>
                            <span className="ml-auto text-sm tabular-nums flex-shrink-0 w-12 text-right" style={{ color: "var(--text-muted)" }}>
                              {urenTekst(uren)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>
            Geen uren in deze {soort}.
          </p>
        )}

        {/* Alleen als je naar iedereen kijkt: anders staat er één regel met
            hetzelfde getal als hierboven. */}
        {perPersoon.length > 1 && (
          <div className="mt-5">
            <h2 className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Per persoon</h2>
            <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
              {perPersoon.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                >
                  {p.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar} alt={p.naam} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ background: "var(--text-heading)" }}
                    >
                      {p.naam.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm" style={{ color: "var(--text-heading)" }}>{p.naam}</span>
                  <span className="ml-auto text-sm tabular-nums" style={{ color: "var(--text-heading)" }}>
                    {urenTekst(p.uren)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type Groep = {
  sleutel: string;
  project: string;
  klant: string | null;
  logo: string | null;
  uren: number;
  /** Omschrijving naar uren. Twee keer dezelfde omschrijving telt op. */
  regels: Map<string, number>;
};

function Knopje({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="card-hover px-2 flex items-center"
      style={{ height: 30, color: "var(--text-muted)" }}
    >
      {children}
    </button>
  );
}

/** De dag waarop een regel telt: het begin als dat er is, anders de datum. */
function dagVan(e: TimeEntry): string {
  return e.start_at ? isoDag(new Date(e.start_at)) : e.date;
}

function reeks(anker: Date, soort: "week" | "maand"): Date[] {
  if (soort === "week") return Array.from({ length: 7 }, (_, i) => dagErbij(anker, i));
  const aantal = new Date(anker.getFullYear(), anker.getMonth() + 1, 0).getDate();
  return Array.from({ length: aantal }, (_, i) => new Date(anker.getFullYear(), anker.getMonth(), i + 1));
}

function maandagVan(d: Date): Date {
  const kopie = new Date(d);
  kopie.setHours(0, 0, 0, 0);
  kopie.setDate(kopie.getDate() - ((kopie.getDay() + 6) % 7));
  return kopie;
}

function eersteVan(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function dagErbij(d: Date, aantal: number): Date {
  const kopie = new Date(d);
  kopie.setDate(kopie.getDate() + aantal);
  return kopie;
}

function isoDag(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function vandaag(d: Date): boolean {
  return isoDag(d) === isoDag(new Date());
}

function urenTekst(uren: number): string {
  const totaal = Math.round(uren * 60);
  return `${Math.floor(totaal / 60)}:${String(totaal % 60).padStart(2, "0")}`;
}

function weekLabel(maandag: Date): string {
  const zondag = dagErbij(maandag, 6);
  const maand = (d: Date) => d.toLocaleDateString("nl-NL", { month: "short" });
  return maandag.getMonth() === zondag.getMonth()
    ? `${maandag.getDate()} – ${zondag.getDate()} ${maand(zondag)}`
    : `${maandag.getDate()} ${maand(maandag)} – ${zondag.getDate()} ${maand(zondag)}`;
}

function maandLabel(d: Date): string {
  return d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}
