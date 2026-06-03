"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/TransactionForm";
import { deleteTransactionAction } from "@/lib/actions/transactions";
import type { Transaction, Client, Project } from "@/lib/types";

const MONTH_COLORS = [
  "#93c5fd", "#fcd34d", "#6ee7b7", "#c4b5fd", "#fdba74", "#f9a8d4",
  "#67e8f9", "#a5f3fc", "#bbf7d0", "#fde68a", "#ddd6fe", "#fed7aa",
];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

function fmtFull(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
}

function TransactionDetail({
  transaction,
  clients,
  projects,
  onClose,
}: {
  transaction: Transaction;
  clients: Pick<Client, "id" | "name" | "logo_url">[];
  projects: Pick<Project, "id" | "title" | "client_id">[];
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TransactionForm
        transaction={transaction}
        clients={clients}
        projects={projects}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <p className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Type</p>
          <span
            className="inline-block px-2.5 py-1 rounded-md text-xs font-medium"
            style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-heading)" }}
          >
            {transaction.description}
          </span>
        </div>
        <div>
          <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Bedrag</p>
          <p className="text-sm font-medium" style={{ color: transaction.amount >= 0 ? "var(--text-heading)" : "#e57373" }}>
            {fmtFull(transaction.amount)}
          </p>
        </div>
        <div>
          <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Datum</p>
          <p className="text-sm" style={{ color: "var(--text-heading)" }}>{fmtDate(transaction.date)}</p>
        </div>
        {transaction.clients && (
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Klant</p>
            <p className="text-sm" style={{ color: "var(--text-heading)" }}>{transaction.clients.name}</p>
          </div>
        )}
        {transaction.projects && (
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Project</p>
            <p className="text-sm" style={{ color: "var(--text-heading)" }}>{transaction.projects.title}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <form action={deleteTransactionAction} onSubmit={onClose}>
          <input type="hidden" name="id" value={transaction.id} />
          <button type="submit" className="text-sm px-3 py-1.5 rounded-md" style={{ color: "#e57373" }}>
            Verwijderen
          </button>
        </form>
        <button
          onClick={() => setEditing(true)}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          Bewerken
        </button>
      </div>
    </div>
  );
}

export default function FinancePageClient({
  transactions,
  clients,
  projects,
}: {
  transactions: Transaction[];
  clients: Pick<Client, "id" | "name" | "logo_url">[];
  projects: Pick<Project, "id" | "title" | "client_id">[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const thisMonthTotal = useMemo(() => {
    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, currentYear, currentMonth]);

  const prevMonthTotal = useMemo(() => {
    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, prevMonthYear, prevMonth]);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_LABELS[i], total: 0, idx: i }));
    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === currentYear) months[d.getMonth()].total += t.amount;
    });
    // Hide future months with no revenue
    return months.filter((m) => m.idx <= currentMonth || m.total > 0);
  }, [transactions, currentYear, currentMonth]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="px-3 py-2 rounded-md text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-heading)" }}>
          <div className="font-medium">{label}</div>
          <div style={{ color: "var(--text-muted)" }}>{fmtFull(payload[0].value)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8" style={{ color: "var(--text-heading)" }}>
        Finance <span className="font-medium" style={{ color: "var(--text-muted)" }}>({currentYear})</span>
      </h1>

      {/* Top panels */}
      <div className="grid grid-cols-3 gap-4 mb-8">

        {/* Left: twee KPI cards gestapeld */}
        <div className="flex flex-col gap-4">
          {/* Deze maand */}
          <div
            className="flex-1 rounded-lg p-6 flex flex-col justify-between relative overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
          >
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full" style={{ background: "var(--bg-secondary)" }} />
            <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full opacity-60" style={{ background: "var(--bg-secondary)" }} />

            <p className="text-xs font-medium uppercase tracking-wider relative z-10" style={{ color: "var(--text-muted)" }}>
              Deze maand
            </p>
            <div className="relative z-10">
              <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-heading)" }}>
                {fmtFull(thisMonthTotal)}
              </p>
            </div>
            <p className="text-sm relative z-10 mt-1" style={{ color: "var(--text-muted)" }}>
              {new Date(currentYear, currentMonth).toLocaleDateString("nl-NL", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase())}
            </p>
          </div>

          {/* Vorige maand */}
          <div
            className="flex-1 rounded-lg p-6 flex flex-col justify-between"
            style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
          >
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Vorige maand
            </p>
            <div>
              <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-heading)" }}>
                {fmtFull(prevMonthTotal)}
              </p>
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {new Date(prevMonthYear, prevMonth).toLocaleDateString("nl-NL", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase())}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="col-span-2 rounded-lg p-5 flex flex-col" style={{ border: "1px solid var(--border)" }}>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Omzet {currentYear}</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={18} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(v) => v === 0 ? "€0" : `€${(v / 1000).toFixed(1)}K`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.idx} fill={entry.idx === currentMonth ? "#f97316" : MONTH_COLORS[entry.idx % MONTH_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions table */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>Transacties</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs px-2.5 py-1 rounded-md"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          + Toevoegen
        </button>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {transactions.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Omschrijving</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Project</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Klant</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Datum</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="cursor-pointer"
                  style={{
                    borderBottom: i < transactions.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td className="px-4 py-3">
                    <span
                      className="inline-block px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-heading)" }}
                    >
                      {tx.description}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{tx.projects?.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    {tx.clients ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                        >
                          {tx.clients.logo_url ? (
                            /^https?|^\//.test(tx.clients.logo_url) ? (
                              <img src={tx.clients.logo_url} alt={tx.clients.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-sm">{tx.clients.logo_url}</span>
                            )
                          ) : (
                            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                              {tx.clients.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{tx.clients.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right" style={{ color: "var(--text-muted)" }}>{fmtDate(tx.date)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: tx.amount >= 0 ? "var(--text-heading)" : "#e57373" }}>
                    {fmtFull(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Nog geen transacties.{" "}
            <button onClick={() => setShowAdd(true)} className="underline" style={{ color: "var(--text)" }}>
              Voeg de eerste toe.
            </button>
          </p>
        )}
      </div>

      {showAdd && (
        <Modal title="Transactie toevoegen" onClose={() => setShowAdd(false)}>
          <TransactionForm clients={clients} projects={projects} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {selectedTx && (
        <Modal title="Transactie" onClose={() => setSelectedTx(null)}>
          <TransactionDetail
            transaction={selectedTx}
            clients={clients}
            projects={projects}
            onClose={() => setSelectedTx(null)}
          />
        </Modal>
      )}
    </div>
  );
}
