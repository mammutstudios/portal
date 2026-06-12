"use client";

import { useState } from "react";
import { createTimeEntryAction, updateTimeEntryAction } from "@/lib/actions/timeEntries";
import SearchSelect from "@/components/SearchSelect";
import DatePicker from "@/components/DatePicker";
import type { TimeEntry, Profile } from "@/lib/types";

type ProjectOption = { id: string; title: string; clients?: { name: string; logo_url: string | null } | null };

export default function TimeEntryForm({
  entry,
  projects,
  profiles,
  defaultProfileId,
  onClose,
}: {
  entry?: TimeEntry;
  projects: ProjectOption[];
  profiles: Pick<Profile, "id" | "full_name" | "avatar_url">[];
  defaultProfileId?: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      if (entry) await updateTimeEntryAction(fd);
      else await createTimeEntryAction(fd);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {entry && <input type="hidden" name="id" value={entry.id} />}

      {/* Task */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Taak *</label>
        <input
          name="task"
          required
          autoFocus
          defaultValue={entry?.task}
          placeholder="bijv. dev"
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
      </div>

      {/* Hours + Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Uren *</label>
          <input
            name="hours"
            type="number"
            step="0.25"
            required
            defaultValue={entry?.hours}
            placeholder="0.00"
            className="w-full px-3 py-2 rounded-md text-sm outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Datum *</label>
          <DatePicker name="date" defaultValue={entry?.date ?? new Date().toISOString().slice(0, 10)} />
        </div>
      </div>

      {/* Project */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Project</label>
        <SearchSelect
          name="project_id"
          placeholder="— Geen —"
          options={projects.map((p) => ({
            value: p.id,
            label: p.title,
            rightMeta: p.clients ? { label: p.clients.name, logo_url: p.clients.logo_url } : undefined,
          }))}
          defaultValue={entry?.project_id ?? undefined}
        />
      </div>

      {/* Who */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Wie</label>
        <SearchSelect
          name="profile_id"
          placeholder="— Niemand —"
          subtle
          showAvatars
          options={profiles.map((p) => ({ value: p.id, label: p.full_name ?? "Onbekend", avatar: p.avatar_url }))}
          defaultValue={entry?.profile_id ?? defaultProfileId ?? undefined}
        />
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-md" style={{ background: "#fef2f2", color: "#e57373" }}>{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md text-sm" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          Annuleren
        </button>
        <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-md text-sm font-medium" style={{ background: "var(--text-heading)", color: "#fff", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Bezig..." : entry ? "Opslaan" : "Toevoegen"}
        </button>
      </div>
    </form>
  );
}
