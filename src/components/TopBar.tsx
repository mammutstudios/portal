"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CaretDown, GearSix, SignOut } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import MammutMark from "@/components/MammutMark";
import ClientLogo from "@/components/ClientLogo";
import Kruimels from "@/components/Kruimels";

export default function TopBar({
  name,
  avatarUrl,
  homeHref,
  settingsHref = "/dashboard/settings",
}: {
  /**
   * Null betekent: de naam is nog onderweg. De balk staat er dan al, met een
   * balkje op de plek van het account, zodat de schil niet verspringt.
   */
  name: string | null;
  avatarUrl: string | null;
  homeHref: string;
  /** Null verbergt het item; het klantportaal heeft nog geen eigen instellingen. */
  settingsHref?: string | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Klik buiten het menu sluit het menu, en Escape ook.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  return (
    <header
      className="app-topbar hidden md:flex items-stretch flex-shrink-0"
      // 48 en niet 64: sinds het zoekveld naar de zijbalk ging staan hier
      // alleen nog het logo en het account, en die vragen die hoogte niet.
      style={{ height: 48, borderBottom: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {/* Logo-vak precies zo breed als de sidebar, met dezelfde scheidingslijn erna. */}
      <Link
        href={homeHref}
        className="app-topbar-logo flex items-center gap-2.5 flex-shrink-0 px-4"
        // Min de 1px van het streepje hierna: samen zijn ze precies zo breed als de
        // sidebar, waarvan de rand binnen die breedte valt (border-box).
        //
        // Zelfde tint als het menu eronder, zodat het logo bij de navigatie
        // hoort en niet bij de witte balk ernaast. De hele linkerkolom leest zo
        // als één ding, van logo tot onderste menu-item.
        style={{
          width: "calc(var(--sidebar-width) - 1px)",
          background: "var(--sidebar-bg)",
        }}
      >
        <MammutMark />
        <span className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
          Mammut Studios
        </span>
      </Link>

      {/* Van boven tot onder, zodat hij aansluit op de border-right van de
          sidebar eronder en de lijn tussen navigatie en inhoud in één keer
          doorloopt. Stond eerder met lucht boven en onder, zoals bij
          Moneybird, maar dat breekt de kolom nu het logovak dezelfde tint
          heeft als het menu. */}
      <span aria-hidden className="w-px flex-shrink-0" style={{ background: "var(--border)" }} />

      {/* Het zoeken is naar de zijbalk verhuisd; op die plek staan nu de
          kruimels, zodat de balk zegt waar je bent in plaats van leeg te zijn. */}
      <div className="flex-1 relative flex items-center">
        {/* In een <Suspense>, want Kruimels leest de route met usePathname.
            Met cacheComponents aan is dat ongecachte data, en zonder grens
            eromheen blokkeert het het prerenderen van elke route met een
            dynamische parameter. Leeg tot hij er is, dus fallback null. */}
        <div className="px-3 min-w-0">
          <Suspense fallback={null}>
            <Kruimels />
          </Suspense>
        </div>
        <div ref={menuRef} className="absolute right-4">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md card-hover"
          >
            {name === null ? (
              <>
                <span
                  aria-hidden
                  className="w-6 h-6 rounded flex-shrink-0"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                />
                <span aria-hidden className="h-3 rounded" style={{ width: 84, background: "var(--border)" }} />
              </>
            ) : (
              <>
                <ClientLogo logo_url={avatarUrl} name={name} />
                <span className="text-sm" style={{ color: "var(--text-heading)" }}>{name}</span>
              </>
            )}
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
