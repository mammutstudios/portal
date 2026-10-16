"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import ClientLogo from "@/components/ClientLogo";
import { globalSearchAction, type SearchHit } from "@/lib/actions/search";

const GROEP_VOLGORDE: SearchHit["group"][] = ["Klanten", "Projects", "Tasks", "Facturen"];

/**
 * Zoeken over alles, vanuit de zijbalk.
 *
 * Twee delen: een knop die eruitziet als een veld, en een palet dat daar
 * overheen komt. Geen uitklaplijst onder de knop, want de zijbalk is 15,5rem
 * breed en de schil eromheen heeft overflow-hidden: een lijst die breder is
 * dan de balk zou worden afgeknipt. Een palet midden op het scherm heeft dat
 * probleem niet en geeft de resultaten meteen de ruimte.
 */
export default function Zoeken() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Cmd-K opent, Escape sluit. De schuine streep blijft werken: die zat er al
  // en is sneller als je toch al met één hand typt.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typt = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "/" && !typt) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-2.5 rounded-lg text-sm"
        style={{
          height: 32,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--text-muted)",
          transition: "background 150ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
      >
        <MagnifyingGlass size={15} />
        <span className="flex-1 text-left">Zoeken</span>
        <kbd
          className="text-xs px-1.5 rounded"
          style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
        >
          ⌘K
        </kbd>
      </button>

      {open && <Palet onSluiten={() => setOpen(false)} onGa={(href) => { setOpen(false); router.push(href); }} />}
    </>
  );
}

function Palet({ onSluiten, onGa }: { onSluiten: () => void; onGa: (href: string) => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [bezig, setBezig] = useState(false);
  const [gemarkeerd, setGemarkeerd] = useState(0);
  const veld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    veld.current?.focus();
  }, []);

  const term = query.trim();

  // Even wachten tot het typen stilvalt, anders vuurt elke toets een query af.
  // Alles wat de staat aanraakt gebeurt in de timeout en niet in het effect
  // zelf: een setState recht in een effect kost een extra ronde door de boom.
  useEffect(() => {
    if (term.length < 2) return;
    let afgebroken = false;

    const t = setTimeout(async () => {
      setBezig(true);
      try {
        const uitkomst = await globalSearchAction(term);
        if (afgebroken) return;
        setHits(uitkomst);
        setGemarkeerd(0);
      } finally {
        if (!afgebroken) setBezig(false);
      }
    }, 250);

    return () => {
      // Typ je door, dan is het antwoord van de vorige term niet meer van
      // belang; zonder deze vlag kan een traag antwoord een nieuwer overschrijven.
      afgebroken = true;
      clearTimeout(t);
    };
  }, [term]);

  // Leegmaken bij een te korte term doen we hier en niet met een setState in
  // het effect hierboven: dat laatste kost een extra ronde door de boom.
  const zichtbaar = term.length >= 2 ? hits : [];

  // In de volgorde waarin ze op het scherm staan, zodat pijltjes en Enter op
  // hetzelfde rijtje werken als je ogen.
  const opVolgorde = GROEP_VOLGORDE.flatMap((groep) => zichtbaar.filter((h) => h.group === groep));

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onSluiten();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setGemarkeerd((i) => Math.min(i + 1, opVolgorde.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setGemarkeerd((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && opVolgorde[gemarkeerd]) {
      e.preventDefault();
      onGa(opVolgorde[gemarkeerd].href);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4"
      style={{ background: "rgb(20 0 24 / 0.25)", paddingTop: "12vh" }}
      onClick={(e) => e.target === e.currentTarget && onSluiten()}
    >
      <div
        className="w-full max-w-xl rounded-xl overflow-hidden"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "0 16px 48px rgb(20 0 24 / 0.18)" }}
      >
        <div
          className="flex items-center gap-2.5 px-4"
          style={{ height: 52, borderBottom: "1px solid var(--border)" }}
        >
          <MagnifyingGlass size={17} style={{ color: "var(--text-muted)" }} />
          <input
            ref={veld}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Zoek een klant, project, task of factuur"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-heading)" }}
          />
          <kbd
            className="text-xs px-1.5 rounded"
            style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)" }}
          >
            esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {term.length < 2 ? (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              Typ om te zoeken.
            </p>
          ) : opVolgorde.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              {bezig ? "Zoeken…" : `Niets gevonden voor “${query}”.`}
            </p>
          ) : (
            GROEP_VOLGORDE.map((groep) => {
              const rijen = zichtbaar.filter((h) => h.group === groep);
              if (!rijen.length) return null;
              return (
                <div key={groep}>
                  <p
                    className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {groep}
                  </p>
                  {rijen.map((h) => {
                    const i = opVolgorde.indexOf(h);
                    return (
                      <button
                        key={`${h.group}-${h.id}`}
                        onClick={() => onGa(h.href)}
                        onMouseEnter={() => setGemarkeerd(i)}
                        className="w-full text-left px-4 py-2 flex items-center gap-2.5"
                        style={{ background: i === gemarkeerd ? "var(--bg-hover)" : "transparent" }}
                      >
                        {h.group === "Klanten" && <ClientLogo logo_url={h.logo_url} name={h.label} size="xs" />}
                        <span className="text-sm" style={{ color: "var(--text-heading)" }}>
                          {h.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
