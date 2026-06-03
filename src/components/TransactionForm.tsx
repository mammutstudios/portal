"use client";

import { useState } from "react";
import { createTransactionAction, updateTransactionAction } from "@/lib/actions/transactions";
import SearchSelect from "@/components/SearchSelect";
import type { Transaction, Client, Project } from "@/lib/types";

const TYPES = ["Aanbetaling", "Restant", "Retainer", "Volledig"] as const;

export default function TransactionForm({
  transaction,
  clients,
  projects,
  onClose,
}: {
  transaction?: Transaction;
  clients: Pick<Client, "id" | "name" | "logo_url">[];
  projects: Pick<Project, "id" | "title" | "client_id">[];
  onClose: () => void;
}) {
  const [type, setType] = useState<string>(transaction?.description ?? "Retainer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const action = transaction ? updateTransactionAction : createTransactionAction;
  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      await action(formData);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}

      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
          Type *
        </label>
        <input type="hidden" name="description" value={type} />
        <div className="grid grid-cols-4 gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="px-2 py-2 rounded-md text-xs font-medium text-center transition-colors"
              style={{
                border: `1px solid ${type === t ? "var(--text-heading)" : "var(--border)"}`,
                background: type === t ? "var(--text-heading)" : "var(--bg)",
                color: type === t ? "#fff" : "var(--text-muted)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Bedrag (€) *
        </label>
        <input
          name="amount"
          type="number"
          step="0.01"
          required
          defaultValue={transaction?.amount}
          placeholder="0.00"
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Maand *
        </label>
        <input
          name="date"
          type="month"
          required
          defaultValue={transaction?.date?.slice(0, 7) ?? today.slice(0, 7)}
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Project
        </label>
        <SearchSelect
          name="project_id"
          placeholder="— Geen —"
          options={projects.map((p) => {
            const client = clients.find((c) => c.id === p.client_id);
            return {
              value: p.id,
              label: p.title,
              rightMeta: client ? { label: client.name, logo_url: client.logo_url } : undefined,
            };
          })}
          defaultValue={transaction?.project_id ?? undefined}
        />
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-md" style={{ background: "#fef2f2", color: "#e57373" }}>
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-md text-sm"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 rounded-md text-sm font-medium"
          style={{ background: "var(--text-heading)", color: "#fff", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Bezig..." : transaction ? "Opslaan" : "Aanmaken"}
        </button>
      </div>
    </form>
  );
}
