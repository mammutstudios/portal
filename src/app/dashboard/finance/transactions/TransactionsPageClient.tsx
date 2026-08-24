"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/TransactionForm";
import { deleteTransactionAction } from "@/lib/actions/transactions";
import type { Transaction, Client, Project } from "@/lib/types";

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
    return <TransactionForm transaction={transaction} clients={clients} projects={projects} onClose={onClose} />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium" style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-heading)" }}>
            {transaction.description}
          </span>
          {transaction.status === "draft" && (
            <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: "#fff7ed", color: "#f97316", border: "1px solid #fed7aa" }}>
              Concept
            </span>
          )}
        </div>
        <div>
          <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Bedrag</p>
          <p className="text-sm font-medium" style={{ color: transaction.amount >= 0 ? "var(--text-heading)" : "#e57373" }}>{fmtFull(transaction.amount)}</p>
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
          <button type="submit" className="text-sm px-3 py-1.5 rounded-md" style={{ color: "#e57373" }}>Verwijderen</button>
        </form>
        <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 rounded-md font-medium" style={{ background: "var(--text-heading)", color: "#fff" }}>
          Bewerken
        </button>
      </div>
    </div>
  );
}

export default function TransactionsPageClient({
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

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>Transacties</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          + Toevoegen
        </button>
      </div>

      <div className="squircle overflow-x-auto" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        {transactions.length > 0 ? (
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Omschrijving</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Project</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Klant</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Datum</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="cursor-pointer"
                  style={{ borderBottom: i < transactions.length - 1 ? "1px solid var(--border)" : "none", opacity: tx.status === "draft" ? 0.7 : 1 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium" style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-heading)" }}>
                        {tx.description}
                      </span>
                      {tx.status === "draft" && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: "#fff7ed", color: "#f97316", border: "1px solid #fed7aa" }}>
                          Concept
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-sm" style={{ color: "var(--text-muted)" }}>{tx.projects?.title ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {tx.clients ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                          {tx.clients.logo_url ? (
                            /^https?|^\//.test(tx.clients.logo_url) ? (
                              <img src={tx.clients.logo_url} alt={tx.clients.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-sm">{tx.clients.logo_url}</span>
                            )
                          ) : (
                            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{tx.clients.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{tx.clients.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-right" style={{ color: "var(--text-muted)" }}>{fmtDate(tx.date)}</td>
                  <td className="px-4 py-2.5 text-sm text-right font-medium" style={{ color: tx.amount >= 0 ? "var(--text-heading)" : "#e57373" }}>
                    {fmtFull(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Nog geen transacties.{" "}
            <button onClick={() => setShowAdd(true)} className="underline" style={{ color: "var(--text)" }}>Voeg de eerste toe.</button>
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
          <TransactionDetail transaction={selectedTx} clients={clients} projects={projects} onClose={() => setSelectedTx(null)} />
        </Modal>
      )}
    </div>
  );
}
