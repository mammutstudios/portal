"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import MammutLogo from "@/components/MammutLogo";
import {
  SquaresFour,
  CheckSquare,
  Folder,
  CurrencyDollar,
  Users,
  CaretUp,
  Eye,
  FolderOpen,
  X,
  Clock,
  List,
  ChartBar,
} from "@phosphor-icons/react";

type SubItem = { label: string; href: string };

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: SubItem[];
};

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
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
    label: "CRM",
    href: "/dashboard/clients",
    icon: <Users size={19} weight="fill" />,
    children: [
      { label: "Overzicht", href: "/dashboard/clients" },
      { label: "Contactpersonen", href: "/dashboard/contacts" },
    ],
  },
];

const clientNav: NavItem[] = [
  {
    label: "Overzicht",
    href: "/portal/overzicht",
    icon: <SquaresFour size={19} weight="fill" />,
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

export default function Sidebar({
  role,
  showAnalytics = true,
}: {
  role: "admin" | "client";
  /** Uit als deze klant geen gekoppelde site heeft; dan is de pagina leeg. */
  showAnalytics?: boolean;
}) {
  const pathname = usePathname();
  const navItems =
    role === "admin"
      ? adminNav
      : clientNav.filter((item) => showAnalytics || item.href !== "/portal/analytics");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14"
        style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <MammutLogo className="h-5 w-auto flex-shrink-0" style={{ color: "var(--ink)" }} />
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
        className={`app-sidebar flex flex-col z-50 md:sticky md:top-0 md:translate-x-0 fixed top-0 left-0 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          width: "15.5rem",
          minWidth: "15.5rem",
        }}
      >
        {/* Logo — op desktop staat die in de topbar, hier alleen voor de mobiele drawer */}
        <div className="md:hidden px-4 py-4 flex items-center justify-between gap-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <MammutLogo className="h-5 w-auto flex-shrink-0" style={{ color: "var(--ink)" }} />
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
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={() => setMobileOpen(false)} />
          ))}
        </nav>

      {/* Preview + Sign out */}
      <div className="px-3 py-3 space-y-0.5">
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
