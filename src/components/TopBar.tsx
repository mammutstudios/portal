"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MagnifyingGlass, CaretDown, GearSix, SignOut } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import MammutMark from "@/components/MammutMark";
import ClientLogo from "@/components/ClientLogo";
import { globalSearchAction, type SearchHit } from "@/lib/actions/search";

const GROUP_ORDER: SearchHit["group"][] = ["Klanten", "Projecten", "Tickets", "Facturen"];

export default function TopBar({
  name,
  avatarUrl,
  homeHref,
  settingsHref = "/dashboard/settings",
}: {
  name: string;
  avatarUrl: string | null;
  homeHref: string;
  /** Null verbergt het item; het klantportaal heeft nog geen eigen instellingen. */
  settingsHref?: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Even wachten met zoeken tot het typen stilvalt, anders vuurt elke toets een query af.
  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        setHits(await globalSearchAction(query));
        setOpen(true);
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Klik buiten het veld sluit de lijst, en buiten het menu sluit het menu.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // "/" springt naar het zoekveld, zoals in Moneybird.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") { setOpen(false); setMenuOpen(false); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <header
      className="hidden md:flex items-stretch flex-shrink-0"
      style={{ height: 64, borderBottom: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {/* Logo-vak precies zo breed als de sidebar, met dezelfde scheidingslijn erna. */}
      <Link
        href={homeHref}
        className="flex items-center gap-2.5 flex-shrink-0 px-4"
        // Min de 1px van het streepje hierna: samen zijn ze precies zo breed als de
        // sidebar, waarvan de rand binnen die breedte valt (border-box).
        style={{ width: "calc(var(--sidebar-width) - 1px)" }}
      >
        <MammutMark className="h-7 w-7 flex-shrink-0" />
        <span className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
          Mammut Studios
        </span>
      </Link>

      {/* Streepje met lucht boven en onder, zoals bij Moneybird. */}
      <span aria-hidden className="w-px my-3 flex-shrink-0" style={{ background: "var(--border)" }} />

      {/* Zelfde container als de pagina-inhoud, zodat het zoekveld links uitlijnt. */}
      <div className="flex-1 relative flex items-center">
        <div className="w-full max-w-5xl mx-auto px-4 md:px-10">
      <div ref={boxRef} className="relative w-full max-w-lg">
        <div
          className="flex items-center gap-2 px-3 rounded-lg"
          style={{ height: 40, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
        >
          <MagnifyingGlass size={16} style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => hits.length && setOpen(true)}
            placeholder="Zoeken"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-heading)" }}
          />
          <kbd
            className="text-xs px-1.5 rounded"
            style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-muted)" }}
          >
            /
          </kbd>
        </div>

        {open && query.trim().length >= 2 && (
          <div
            className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgb(20 0 24 / 0.12)",
            }}
          >
            {hits.length === 0 && (
              <p className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                {busy ? "Zoeken…" : `Niets gevonden voor “${query}”.`}
              </p>
            )}
            {GROUP_ORDER.map((group) => {
              const rows = hits.filter((h) => h.group === group);
              if (!rows.length) return null;
              return (
                <div key={group}>
                  <p
                    className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {group}
                  </p>
                  {rows.map((h) => (
                    <button
                      key={`${h.group}-${h.id}`}
                      onClick={() => go(h.href)}
                      className="card-hover w-full text-left px-4 py-2 flex items-center gap-2.5"
                    >
                      {h.group === "Klanten" && <ClientLogo logo_url={h.logo_url} name={h.label} />}
                      <span className="text-sm" style={{ color: "var(--text-heading)" }}>{h.label}</span>
                      {h.sublabel && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{h.sublabel}</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

        </div>

        <div ref={menuRef} className="absolute right-4">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md card-hover"
          >
            <ClientLogo logo_url={avatarUrl} name={name} />
            <span className="text-sm" style={{ color: "var(--text-heading)" }}>{name}</span>
            <CaretDown
              size={12}
              weight="bold"
              style={{
                color: "var(--text-muted)",
                transition: "transform 150ms",
                transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-1 rounded-lg overflow-hidden z-50"
              style={{
                minWidth: 200,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 32px rgb(20 0 24 / 0.12)",
              }}
            >
              {settingsHref && (
              <Link
                href={settingsHref}
                onClick={() => setMenuOpen(false)}
                className="card-hover flex items-center gap-2.5 px-3 py-2.5 text-sm w-full"
                style={{ color: "var(--text)" }}
              >
                <GearSix size={16} className="opacity-70" />
                Instellingen
              </Link>
              )}
              {settingsHref && (
                <div className="mx-3" style={{ borderTop: "1px solid var(--border)" }} />
              )}
              <button
                onClick={signOut}
                className="card-hover flex items-center gap-2.5 px-3 py-2.5 text-sm w-full"
                style={{ color: "var(--text)" }}
              >
                <SignOut size={16} className="opacity-70" />
                Uitloggen
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
