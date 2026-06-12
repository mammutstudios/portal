"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { startPreviewAction } from "@/lib/actions/preview";
import {
  SquaresFour,
  CheckSquare,
  Folder,
  CurrencyDollar,
  Users,
  CaretUp,
  Eye,
  SignOut,
  FolderOpen,
  X,
  GearSix,
  Clock,
  List,
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
          className="flex items-center rounded-md"
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
            className="flex items-center gap-2.5 px-2 py-2.5 text-sm flex-1"
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
            className="mr-1 p-1 rounded-md"
            style={{
              color: "var(--text-muted)",
              background: "transparent",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <CaretUp
              size={12}
              weight="bold"
              style={{ transition: "transform 150ms", transform: open ? "rotate(0deg)" : "rotate(180deg)" }}
            />
          </button>
        </div>

        {open && (
          <div className="mt-0.5 space-y-0.5" style={{ marginLeft: "26px" }}>
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
      className="flex items-center gap-2.5 px-2 py-2.5 rounded-md text-sm"
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
      className="flex items-center px-2 py-1 rounded-md"
      style={{
        fontSize: "0.75rem",
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
    icon: <SquaresFour size={17} weight="fill" />,
  },
  {
    label: "Tickets",
    href: "/dashboard/tasks",
    icon: <CheckSquare size={17} weight="fill" />,
  },
  {
    label: "Projecten",
    href: "/dashboard/projects",
    icon: <Folder size={17} weight="fill" />,
  },
  {
    label: "Toggl",
    href: "/dashboard/toggl",
    icon: <Clock size={17} weight="fill" />,
  },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: <CurrencyDollar size={17} weight="bold" />,
    children: [
      { label: "Overzicht", href: "/dashboard/finance" },
      { label: "Transacties", href: "/dashboard/finance/transactions" },
    ],
  },
  {
    label: "CRM",
    href: "/dashboard/clients",
    icon: <Users size={17} weight="fill" />,
    children: [
      { label: "Overzicht", href: "/dashboard/clients" },
      { label: "Contactpersonen", href: "/dashboard/contacts" },
    ],
  },
];

const clientNav: NavItem[] = [
  {
    label: "Mijn projecten",
    href: "/portal",
    icon: <FolderOpen size={17} weight="fill" />,
  },
];

type ClientOption = { id: string; name: string; logo_url: string | null };

export default function Sidebar({ role, clients = [] }: { role: "admin" | "client"; clients?: ClientOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const navItems = role === "admin" ? adminNav : clientNav;
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14"
        style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
            <img src="/icon.png" alt="Mammut" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>Mammut Studios</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md" style={{ color: "var(--text-heading)" }} aria-label="Menu">
          <List size={22} weight="bold" />
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.35)" }} onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`flex flex-col h-screen z-50 md:sticky md:top-0 md:translate-x-0 fixed top-0 left-0 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          width: 260,
          minWidth: 260,
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div className="px-4 py-4 flex items-center justify-between gap-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
              <img src="/icon.png" alt="Mammut" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
              Mammut Studios
            </span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden p-1 rounded-md" style={{ color: "var(--text-muted)" }} aria-label="Sluiten">
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={() => setMobileOpen(false)} />
          ))}
        </nav>

      {/* Preview + Sign out */}
      <div className="px-2 py-3 space-y-0.5" style={{ borderTop: "1px solid var(--border)" }}>
        {role === "admin" && (
          <>
            <button
              onClick={() => setShowClientPicker(true)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm w-full transition-colors hover:bg-[#f1f1ef] hover:text-[var(--text-heading)]"
              style={{ color: "var(--text-muted)" }}
            >
              <Eye size={16} weight="regular" className="opacity-70" />
              Klantportaal bekijken
            </button>

            {/* Client picker overlay */}
            {showClientPicker && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.3)" }}
                onClick={() => setShowClientPicker(false)}
              >
                <div
                  className="rounded-xl p-5 w-80 max-h-[70vh] flex flex-col"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Bekijk als organisatie</h2>
                    <button onClick={() => setShowClientPicker(false)} style={{ color: "var(--text-muted)" }}>
                      <X size={15} weight="bold" />
                    </button>
                  </div>
                  <div className="overflow-y-auto space-y-1">
                    {clients.map((c) => (
                      <form key={c.id} action={startPreviewAction}>
                        <input type="hidden" name="client_id" value={c.id} />
                        <button
                          type="submit"
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm"
                          style={{ color: "var(--text-heading)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                        >
                          <div
                            className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                          >
                            {c.logo_url ? (
                              /^https?|^\//.test(c.logo_url) ? (
                                <img src={c.logo_url} alt={c.name} className="w-full h-full object-contain" />
                              ) : (
                                <span style={{ fontSize: "14px" }}>{c.logo_url}</span>
                              )
                            ) : (
                              <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)" }}>
                                {c.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {c.name}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm w-full transition-colors hover:bg-[#f1f1ef] hover:text-[var(--text-heading)]"
          style={{ color: "var(--text-muted)" }}
        >
          <GearSix size={16} weight="regular" className="opacity-70" />
          Instellingen
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm w-full transition-colors hover:bg-[#f1f1ef] hover:text-[var(--text-heading)]"
          style={{ color: "var(--text-muted)" }}
        >
          <SignOut size={16} weight="regular" className="opacity-70" />
          Uitloggen
        </button>
      </div>
      </aside>
    </>
  );
}
