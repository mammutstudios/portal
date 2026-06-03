"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
} from "@phosphor-icons/react";

type SubItem = { label: string; href: string };

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: SubItem[];
};

function NavLink({ item }: { item: NavItem }) {
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
            onClick={() => setOpen(true)}
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
                <SubNavLink key={sub.href} sub={sub} active={subActive} />
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

function SubNavLink({ sub, active }: { sub: { label: string; href: string }; active: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={sub.href}
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
    label: "Taken",
    href: "/dashboard/tasks",
    icon: <CheckSquare size={17} weight="fill" />,
  },
  {
    label: "Projecten",
    href: "/dashboard/projects",
    icon: <Folder size={17} weight="fill" />,
  },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: <CurrencyDollar size={17} weight="bold" />,
  },
  {
    label: "Klanten",
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

export default function Sidebar({ role }: { role: "admin" | "client" }) {
  const router = useRouter();
  const supabase = createClient();
  const navItems = role === "admin" ? adminNav : clientNav;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className="flex flex-col h-screen sticky top-0"
      style={{
        width: 260,
        minWidth: 260,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
          <img src="/icon.png" alt="Mammut" className="w-full h-full object-cover" />
        </div>
        <span className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
          Mammut Studios
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Preview + Sign out */}
      <div className="px-2 py-3 space-y-0.5" style={{ borderTop: "1px solid var(--border)" }}>
        {role === "admin" && (
          <form action={startPreviewAction}>
            <button
              type="submit"
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm w-full transition-colors hover:bg-[#f1f1ef] hover:text-[var(--text-heading)]"
              style={{ color: "var(--text-muted)" }}
            >
              <Eye size={16} weight="regular" className="opacity-70" />
              Klantportaal bekijken
            </button>
          </form>
        )}
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
  );
}
