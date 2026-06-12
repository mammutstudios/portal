"use client";

import { useState, useRef, useEffect } from "react";
import { CaretDown, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { createTransactionAction, updateTransactionAction } from "@/lib/actions/transactions";
import { quickCreateProjectAction } from "@/lib/actions/projects";
import SearchSelect from "@/components/SearchSelect";
import type { Transaction, Client, Project } from "@/lib/types";

const TYPES = ["Aanbetaling", "Restant", "Retainer", "Volledig"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const MONTHS_FULL = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

function MonthPicker({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(defaultValue ? parseInt(defaultValue.slice(0, 4)) : now.getFullYear());
  const [month, setMonth] = useState(defaultValue ? parseInt(defaultValue.slice(5, 7)) - 1 : now.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const value = `${year}-${String(month + 1).padStart(2, "0")}`;
  const label = `${MONTHS_FULL[month]} ${year}`;

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 rounded-md text-sm flex items-center justify-between outline-none"
        style={{ border: `1px solid ${open ? "var(--text-heading)" : "var(--border)"}`, background: "var(--bg)", color: "var(--text)" }}
      >
        <span>{label}</span>
        <CaretDown size={13} weight="bold" style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-md p-3"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
        >
          {/* Year nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setYear((y) => y - 1)} className="p-1 rounded-md hover:bg-[var(--bg-hover)]">
              <CaretLeft size={13} weight="bold" style={{ color: "var(--text-muted)" }} />
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>{year}</span>
            <button type="button" onClick={() => setYear((y) => y + 1)} className="p-1 rounded-md hover:bg-[var(--bg-hover)]">
              <CaretRight size={13} weight="bold" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((m, i) => {
              const isSelected = i === month && year === (defaultValue ? parseInt(value.slice(0, 4)) : year) || (i === month);
              const isCurrentSelected = value === `${year}-${String(i + 1).padStart(2, "0")}`;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMonth(i); setOpen(false); }}
                  className="py-1.5 rounded-md text-xs font-medium text-center"
                  style={{
                    background: isCurrentSelected ? "var(--text-heading)" : "transparent",
                    color: isCurrentSelected ? "#fff" : "var(--text)",
                    border: `1px solid ${isCurrentSelected ? "var(--text-heading)" : "transparent"}`,
                  }}
                  onMouseEnter={(e) => { if (!isCurrentSelected) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { if (!isCurrentSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [isDraft, setIsDraft] = useState(transaction?.status === "draft");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingProject, setPendingProject] = useState<{
    title: string;
    resolve: (option: { value: string; label: string; rightMeta?: { label: string; logo_url?: string | null } } | null) => void;
  } | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);

  function handleCreateProject(title: string) {
    return new Promise<{ value: string; label: string; rightMeta?: { label: string; logo_url?: string | null } } | null>((resolve) => {
      setPendingProject({ title, resolve });
    });
  }

  async function handlePickClient(clientId: string) {
    if (!pendingProject || creatingProject) return;
    setCreatingProject(true);
    try {
      const project = await quickCreateProjectAction(pendingProject.title, clientId);
      const client = clients.find((c) => c.id === clientId);
      pendingProject.resolve({
        value: project.id,
        label: project.title,
        rightMeta: client ? { label: client.name, logo_url: client.logo_url } : undefined,
      });
    } catch (e: any) {
      setError(e.message ?? "Project aanmaken mislukt.");
      pendingProject.resolve(null);
    } finally {
      setCreatingProject(false);
      setPendingProject(null);
    }
  }
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
      <input type="hidden" name="status" value={isDraft ? "draft" : "confirmed"} />

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
        <MonthPicker name="date" defaultValue={transaction?.date?.slice(0, 7) ?? today.slice(0, 7)} />
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
          onCreateNew={handleCreateProject}
        />
      </div>

      {/* Organisatie kiezen voor nieuw project */}
      {pendingProject && (
        <div className="rounded-md p-3 space-y-2" style={{ border: "1px solid var(--text-heading)", background: "var(--bg-secondary)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--text-heading)" }}>
            Nieuw project &ldquo;{pendingProject.title}&rdquo; — kies een organisatie:
          </p>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {clients.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={creatingProject}
                onClick={() => handlePickClient(c.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm"
                style={{ color: "var(--text-heading)", opacity: creatingProject ? 0.6 : 1 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
                  {c.logo_url ? (
                    /^https?|^\//.test(c.logo_url) ? (
                      <img src={c.logo_url} alt={c.name} className="w-full h-full object-contain" />
                    ) : (
                      <span style={{ fontSize: "10px" }}>{c.logo_url}</span>
                    )
                  ) : (
                    <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)" }}>{c.name.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                {c.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { pendingProject.resolve(null); setPendingProject(null); }}
            className="text-xs px-2 py-1 rounded-md"
            style={{ color: "var(--text-muted)" }}
          >
            Annuleren
          </button>
        </div>
      )}

      {/* Concept toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
        <button
          type="button"
          onClick={() => setIsDraft((v) => !v)}
          className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all"
          style={{
            border: `1.5px solid ${isDraft ? "#f97316" : "var(--border)"}`,
            background: isDraft ? "#fff7ed" : "transparent",
          }}
        >
          {isDraft && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4l2 2 4-4" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span className="text-sm" style={{ color: isDraft ? "#f97316" : "var(--text-muted)" }}>
          Concept <span className="text-xs" style={{ color: "var(--text-muted)" }}>(verwachte inkomst)</span>
        </span>
      </label>

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
