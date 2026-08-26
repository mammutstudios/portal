"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import MammutMark from "@/components/MammutMark";
import {
  SquaresFour,
  CheckSquare,
  Folder,
  CurrencyDollar,
  Buildings,
  AddressBook,
  CaretUp,
  Eye,
  FolderOpen,
  X,
  Clock,
  List,
  ChartBar,
  Palette,
  Pulse as PulseIcon,
  Handshake,
} from "@phosphor-icons/react";

type SubItem = { label: string; href: string };

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: SubItem[];
};

/**
 * Het pad komt als prop binnen en niet uit usePathname().
 *
 * Op een route met een [id] is het pad pas op verzoektijd bekend, dus die hook
 * laat het menu wachten en daarmee de hele pagina. Zo kan dezelfde markup ook
 * zonder pad gerenderd worden, en dat is precies wat de statische schil nodig
 * heeft: het menu staat er meteen, alleen de markering volgt.
 */
function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string | null;
  onNavigate?: () => void;
}) {
  const hasChildren = !!item.children?.length;
  const isChildActive = hasChildren && item.children!.some((c) => pathname === c.href);
  const isActive = pathname === item.href;
  const isExpanded = hasChildren && (isActive || isChildActive);
  const [open, setOpen] = useState(isExpanded);
  const [hovered, setHovered] = useState(false);

  const linkStyle = (active: boolean, isHovered = false, sub = false) => ({
    background: active ? "var(--bg-hover)" : isHovered ? "var(--bg-hover)" : "transparent",
    color: active || isHovered ? "var(--text-heading)" : "var(--text)",
    fontWeight: sub ? 400 : 600,
    transition: "background 150ms, color 150ms",
  });

  if (hasChildren) {
    return (
      <div>
        <div
          className="flex items-center rounded-md h-10"
          style={{
            background: (isActive && !isChildActive) || hovered ? "var(--bg-hover)" : "transparent",
            transition: "background 150ms",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Link
            href={item.href}
            onClick={() => { setOpen(true); onNavigate?.(); }}
            className="flex items-center gap-2.5 px-2 h-full text-sm flex-1"
            style={{
              color: (isActive && !isChildActive) || hovered ? "var(--text-heading)" : "var(--text)",
              fontWeight: 600,
              transition: "color 150ms",
            }}
          >
            <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
            {item.label}
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-md flex items-center justify-center flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              color: "var(--text-muted)",
              background: "transparent",
              transition: "background 150ms, color 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--border)";
              e.currentTarget.style.color = "var(--text-heading)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <CaretUp
              size={13}
              weight="bold"
              style={{ transition: "transform 150ms", transform: open ? "rotate(0deg)" : "rotate(180deg)" }}
            />
          </button>
        </div>

        {open && (
          // Verticale lijn op 16px: het hart van het icoon hierboven (px-2 = 8px + halve
          // icoonbreedte van 16px). De sub-items schuiven er zelf langs.
          <div className="relative mt-0.5 space-y-0.5">
            <span
              aria-hidden
              className="absolute"
              style={{ top: 6, bottom: 6, left: 17.25, width: 1.5, borderRadius: 1, background: "var(--border)" }}
            />
            {item.children!.map((sub) => {
              const subActive = pathname === sub.href;
              return (
                <SubNavLink key={sub.href} sub={sub} active={subActive} onNavigate={onNavigate} />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={() => onNavigate?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2.5 px-2 h-10 rounded-md text-sm"
      style={linkStyle(isActive, hovered)}
    >
      <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
      {item.label}
    </Link>
  );
}

function SubNavLink({ sub, active, onNavigate }: { sub: { label: string; href: string }; active: boolean; onNavigate?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={sub.href}
      onClick={() => onNavigate?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center py-2 rounded-md text-sm"
      style={{
        marginLeft: 26,
        paddingLeft: 12,
        paddingRight: 12,
        fontWeight: 400,
        background: active ? "var(--bg-hover)" : hovered ? "var(--bg-hover)" : "transparent",
        color: active || hovered ? "var(--text-heading)" : "var(--text)",
        transition: "background 150ms, color 150ms",
      }}
    >
      {sub.label}
    </Link>
  );
}

const adminNav: NavItem[] = [
  {
    label: "Overzicht",
    href: "/dashboard",
    icon: <SquaresFour size={19} weight="fill" />,
  },
  {
    label: "Tickets",
    href: "/dashboard/tasks",
    icon: <CheckSquare size={19} weight="fill" />,
  },
  {
    label: "Projecten",
    href: "/dashboard/projects",
    icon: <Folder size={19} weight="fill" />,
  },
  {
    label: "Deals",
    href: "/dashboard/deals",
    icon: <Handshake size={19} weight="fill" />,
  },
  {
    label: "Toggl",
    href: "/dashboard/toggl",
    icon: <Clock size={19} weight="fill" />,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: <ChartBar size={16} weight="fill" />,
  },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: <CurrencyDollar size={19} weight="bold" />,
    children: [
      { label: "Overzicht", href: "/dashboard/finance" },
      { label: "Facturen", href: "/dashboard/finance/facturen" },
      { label: "Periodiek", href: "/dashboard/finance/periodiek" },
    ],
  },
  {
    label: "Organisaties",
    href: "/dashboard/clients",
    icon: <Buildings size={19} weight="fill" />,
  },
  {
    label: "Contactpersonen",
    href: "/dashboard/contacts",
    icon: <AddressBook size={19} weight="fill" />,
  },
];

/** Staat onderaan bij het portaal-item en niet in de hoofdnavigatie. */
const activiteitenItem: NavItem = {
  label: "Activiteiten",
  href: "/dashboard/activiteiten",
  icon: <PulseIcon size={19} weight="fill" />,
};

const clientNav: NavItem[] = [
  {
    label: "Overzicht",
    href: "/portal/overzicht",
    icon: <SquaresFour size={19} weight="fill" />,
  },
  {
    label: "Projecten",
    href: "/portal/projecten",
    icon: <Folder size={19} weight="fill" />,
  },
  {
    label: "Huisstijl",
    href: "/portal/huisstijl",
    icon: <Palette size={19} weight="fill" />,
  },
  {
    label: "Analytics",
    href: "/portal/analytics",
    icon: <ChartBar size={19} weight="fill" />,
  },
  {
    label: "Facturen",
    href: "/portal/facturen",
    icon: <CurrencyDollar size={19} weight="fill" />,
  },
];

/** De twee klant-items die pas te tonen zijn als we weten wie er kijkt. */
const OPTIONEEL = new Set(["/portal/huisstijl", "/portal/analytics"]);

/**
 * Een item dat zijn plek bezet houdt zolang we nog niet weten of het er hoort.
 * Zonder dit verspringt het menu zodra de klantgegevens binnenstromen.
 */
function NavSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-2 h-10" aria-hidden>
      <span className="w-4 h-4 rounded flex-shrink-0" style={{ background: "var(--border)" }} />
      <span className="h-3 rounded" style={{ width: 72, background: "var(--border)" }} />
    </div>
  );
}

type SidebarProps = {
  role: "admin" | "client";
  /** Uit als deze klant geen gekoppelde site heeft; dan is de pagina leeg. */
  showAnalytics?: boolean;
  /** Uit als er voor deze klant nog geen huisstijlgids bestaat. */
  showBrand?: boolean;
  /**
   * De klantgegevens zijn nog onderweg. Het menu staat er al, met een balkje
   * op de plek van de twee items waarvan we het antwoord nog niet hebben.
   */
  pending?: boolean;
};

/**
 * Het menu zoals het in de statische schil staat: dezelfde markup, maar zonder
 * te weten op welke pagina je bent. Hoort in de fallback van de <Suspense> om
 * <Sidebar> heen, zodat het menu er staat vóórdat de server iets teruggeeft.
 */
export function SidebarFallback(props: SidebarProps) {
  return <SidebarBody {...props} pathname={null} />;
}

export default function Sidebar(props: SidebarProps) {
  const pathname = usePathname();
  return <SidebarBody {...props} pathname={pathname} />;
}

function SidebarBody({
  role,
  showAnalytics = true,
  showBrand = true,
  pending = false,
  pathname,
}: SidebarProps & { pathname: string | null }) {
  const verborgen = new Set(
    [
      showAnalytics ? null : "/portal/analytics",
      showBrand ? null : "/portal/huisstijl",
    ].filter(Boolean) as string[],
  );
  const navItems =
    role === "admin"
      ? adminNav
      : pending
        ? clientNav
        : clientNav.filter((item) => !verborgen.has(item.href));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Zet het scrollen vast zolang de la open staat. Dat moet op `.app-main`
  // gebeuren en niet op `body`: de pagina scrollt in dat contentvlak, body zelf
  // staat stil. Het slot op body deed hier dus niets.
  useEffect(() => {
    const main = document.querySelector<HTMLElement>(".app-main");
    if (!main) return;
    main.style.overflow = mobileOpen ? "hidden" : "";
    return () => { main.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14"
        style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <MammutMark />
          <span className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>Mammut Studios</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md" style={{ color: "var(--text-heading)" }} aria-label="Menu">
          <List size={24} weight="bold" />
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" style={{ background: "rgb(20 0 24 / 0.35)" }} onClick={() => setMobileOpen(false)} />
      )}

      <aside
        // Op mobiel schuift de la vanaf rechts binnen, aan dezelfde kant als de
        // hamburger die hem opent. Op desktop staat hij gewoon links in de rij.
        className={`app-sidebar flex flex-col z-50 md:sticky md:top-0 md:right-auto md:translate-x-0 fixed top-0 right-0 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{
          width: "15.5rem",
          minWidth: "15.5rem",
        }}
      >
        {/* Logo — op desktop staat die in de topbar, hier alleen voor de mobiele drawer */}
        <div className="md:hidden px-4 py-4 flex items-center justify-between gap-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <MammutMark />
            <span className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
              Mammut Studios
            </span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden p-1 rounded-md" style={{ color: "var(--text-muted)" }} aria-label="Sluiten">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) =>
            pending && OPTIONEEL.has(item.href) ? (
              <NavSkeleton key={item.href} />
            ) : (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            ),
          )}
        </nav>

      {/* Preview + Sign out */}
      <div className="px-3 py-3 space-y-0.5">
        {role === "admin" && (
          <NavLink
            item={activiteitenItem}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        )}
        {role === "admin" && (
          <Link
            href="/dashboard/klantportaal"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-2 h-10 rounded-md text-sm w-full transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-heading)]"
            style={{ color: "var(--text-muted)" }}
          >
            <Eye size={18} weight="regular" className="opacity-70" />
            Klantportaal bekijken
          </Link>
        )}
      </div>
      </aside>
    </>
  );
}
