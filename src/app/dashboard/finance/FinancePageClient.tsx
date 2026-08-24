"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { Transaction, Client, Project } from "@/lib/types";
import InvoiceTable, { type MoneybirdInvoice } from "@/components/InvoiceTable";

/** Alle staven in de merkkleur; verwachte omzet wordt onderscheiden door arcering. */
const BAR_COLOR = "#140018";
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const QUARTERS = [
  { label: "Q1", months: [0, 1, 2], range: "Jan – Mar" },
  { label: "Q2", months: [3, 4, 5], range: "Apr – Jun" },
  { label: "Q3", months: [6, 7, 8], range: "Jul – Sep" },
  { label: "Q4", months: [9, 10, 11], range: "Okt – Dec" },
];

function fmtFull(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}


export default function FinancePageClient({
  transactions,
  clients,
  projects,
  draftInvoices = [],
}: {
  transactions: Transaction[];
  clients: Pick<Client, "id" | "name" | "logo_url">[];
  projects: Pick<Project, "id" | "title" | "client_id">[];
  draftInvoices?: MoneybirdInvoice[];
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const confirmed = useMemo(() => transactions.filter((t) => t.status !== "draft"), [transactions]);
  const drafts = useMemo(() => transactions.filter((t) => t.status === "draft"), [transactions]);

  const thisMonthConfirmed = useMemo(() => confirmed
    .filter((t) => { const d = new Date(t.date); return d.getFullYear() === currentYear && d.getMonth() === currentMonth; })
    .reduce((s, t) => s + t.amount, 0), [confirmed, currentYear, currentMonth]);

  const thisMonthDraft = useMemo(() => drafts
    .filter((t) => { const d = new Date(t.date); return d.getFullYear() === currentYear && d.getMonth() === currentMonth; })
    .reduce((s, t) => s + t.amount, 0), [drafts, currentYear, currentMonth]);

  const prevMonthTotal = useMemo(() => confirmed
    .filter((t) => { const d = new Date(t.date); return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonth; })
    .reduce((s, t) => s + t.amount, 0), [confirmed, prevMonthYear, prevMonth]);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_LABELS[i], confirmed: 0, concept: 0, idx: i }));
    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === currentYear) {
        if (t.status === "draft") months[d.getMonth()].concept += t.amount;
        else months[d.getMonth()].confirmed += t.amount;
      }
    });
    return months.filter((m) => m.idx <= currentMonth || m.confirmed > 0 || m.concept > 0);
  }, [transactions, currentYear, currentMonth]);

  const quarterData = useMemo(() => QUARTERS.map((q) => {
    const qConfirmed = confirmed
      .filter((t) => { const d = new Date(t.date); return d.getFullYear() === currentYear && q.months.includes(d.getMonth()); })
      .reduce((s, t) => s + t.amount, 0);
    const qDraft = drafts
      .filter((t) => { const d = new Date(t.date); return d.getFullYear() === currentYear && q.months.includes(d.getMonth()); })
      .reduce((s, t) => s + t.amount, 0);
    const currentQ = Math.floor(currentMonth / 3);
    const thisQ = QUARTERS.indexOf(q);
    return { ...q, confirmed: qConfirmed, draft: qDraft, isCurrent: thisQ === currentQ };
  }), [confirmed, drafts, currentYear, currentMonth]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="px-3 py-2 rounded-md text-sm space-y-1" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-heading)" }}>
          <div className="font-medium">{label}</div>
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
              {p.dataKey === "confirmed" ? "Gefactureerd" : "Verwacht"}: {fmtFull(p.value)}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8" style={{ color: "var(--text-heading)" }}>
        Finance <span className="font-medium" style={{ color: "var(--text-muted)" }}>({currentYear})</span>
      </h1>

      {/* Top panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* KPI cards */}
        <div className="flex flex-col gap-4">
          {/* Deze maand */}
          <div className="flex-1 squircle p-6 flex flex-col justify-between relative overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full" style={{ background: "var(--bg-secondary)" }} />
            <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full opacity-60" style={{ background: "var(--bg-secondary)" }} />
            <p className="text-xs font-medium uppercase tracking-wider relative z-10" style={{ color: "var(--text-muted)" }}>Deze maand</p>
            <div className="relative z-10">
              <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-heading)" }}>{fmtFull(thisMonthConfirmed)}</p>
              {thisMonthDraft > 0 && (
                <p className="text-xs mt-1" style={{ color: "#f97316" }}>+ {fmtFull(thisMonthDraft)} verwacht</p>
              )}
            </div>
            <p className="text-sm relative z-10 mt-1" style={{ color: "var(--text-muted)" }}>
              {new Date(currentYear, currentMonth).toLocaleDateString("nl-NL", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase())}
            </p>
          </div>

          {/* Vorige maand */}
          <div className="flex-1 squircle p-6 flex flex-col justify-between" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Vorige maand</p>
            <div>
              <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-heading)" }}>{fmtFull(prevMonthTotal)}</p>
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {new Date(prevMonthYear, prevMonth).toLocaleDateString("nl-NL", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase())}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="md:col-span-2 squircle p-5 flex flex-col min-h-[16.25rem]" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Omzet {currentYear}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: BAR_COLOR }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Gefactureerd</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm overflow-hidden" style={{ border: `1.5px dashed ${BAR_COLOR}`, background: "repeating-linear-gradient(45deg, rgb(20 0 24 / 0.2), rgb(20 0 24 / 0.2) 2px, transparent 2px, transparent 6px)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Verwacht</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={28} barCategoryGap="8%" margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                {chartData.map((entry) => {
                  const baseColor = BAR_COLOR;
                  return (
                    <pattern key={entry.idx} id={`hatch-${entry.idx}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                      <rect width="6" height="6" fill={`${baseColor}33`} />
                      <line x1="0" y1="0" x2="0" y2="6" stroke={baseColor} strokeWidth="2.5" />
                    </pattern>
                  );
                })}
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(v) => v === 0 ? "€0" : `€${(v / 1000).toFixed(1)}K`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="confirmed" stackId="a" radius={[4, 4, 4, 4]}>
                {chartData.map((entry) => (
                  <Cell key={entry.idx} fill={BAR_COLOR} />
                ))}
              </Bar>
              <Bar dataKey="concept" stackId="a" radius={[4, 4, 4, 4]}>
                {chartData.map((entry) => (
                  <Cell key={entry.idx} fill={`url(#hatch-${entry.idx})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Kwartaaloverzicht */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {quarterData.map((q) => (
          <div
            key={q.label}
            className="squircle p-4"
            style={{
              border: `1px solid ${q.isCurrent ? "var(--text-heading)" : "var(--border)"}`,
              background: q.isCurrent ? "var(--bg-secondary)" : "var(--bg)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: q.isCurrent ? "var(--text-heading)" : "var(--text-muted)" }}>{q.label}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{q.range}</span>
            </div>
            <p className="text-lg font-extrabold" style={{ color: "var(--text-heading)" }}>{fmtFull(q.confirmed)}</p>
            {q.draft > 0 && (
              <p className="text-xs mt-0.5" style={{ color: "#f97316" }}>
                + {fmtFull(q.draft)} verwacht
              </p>
            )}
            {q.draft === 0 && q.confirmed === 0 && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Geen facturen</p>
            )}
          </div>
        ))}
      </div>

      {/* Concepten: wat er nog gefactureerd moet worden */}
      <h2 className="text-sm font-semibold mb-3 mt-8" style={{ color: "var(--text-heading)" }}>
        Nog te factureren
      </h2>
      <InvoiceTable
        invoices={draftInvoices}
        emptyLabel="Geen concepten open, alles is gefactureerd."
        dateLabel="Verwacht"
        dateFormat="month"
        showStatus={false}
      />

    </div>
  );
}
