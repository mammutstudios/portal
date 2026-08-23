"use client";

import { useState } from "react";
import { updateProjectAction } from "@/lib/actions/projects";
import SearchSelect from "@/components/SearchSelect";
import DatePicker from "@/components/DatePicker";
import Select from "@/components/Select";
import { PROJECT_PHASES, PHASE_LABEL } from "@/lib/types";
import type { Project, Client } from "@/lib/types";

const PROJECT_TAGS = ["Branding", "Design", "Development", "Retainer"];

export default function EditProjectForm({
  project,
  clients,
  onClose,
}: {
  project: Project;
  clients: Client[];
  onClose: () => void;
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>(project.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    selectedTags.forEach((t) => formData.append("tags", t));
    const result = await updateProjectAction(project.id, formData);
    if (result?.error) { setError(result.error); setLoading(false); return; }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Naam *</label>
        <input
          name="title"
          required
          defaultValue={project.title}
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Klant</label>
        <SearchSelect
          name="client_id"
          placeholder="Selecteer een organisatie"
          options={clients.map((c) => ({ value: c.id, label: c.name, sublabel: c.client_number ?? undefined }))}
          defaultValue={project.client_id ?? undefined}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Omschrijving</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={project.description ?? ""}
          className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Status</label>
          <Select
            name="status"
            defaultValue={project.status}
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "active", label: "Actief" },
              { value: "on_hold", label: "On hold" },
              { value: "completed", label: "Afgerond" },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Deadline</label>
          <DatePicker name="deadline" defaultValue={project.deadline ?? undefined} placeholder="Geen" />
        </div>
      </div>


      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Fase</label>
          <Select
            name="phase"
            defaultValue={project.phase ?? undefined}
            placeholder="Nog niet gezet"
            options={PROJECT_PHASES.map((f) => ({ value: f, label: PHASE_LABEL[f] }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            Voortgang
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="progress"
              min={0}
              max={100}
              defaultValue={project.progress ?? 0}
              className="w-full px-3 py-2 rounded-md text-sm outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>%</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Nu aan de beurt
        </label>
        <input
          type="text"
          name="next_step"
          defaultValue={project.next_step ?? ""}
          placeholder="Waar we deze week aan werken"
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Ziet de klant.</p>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Van de klant nodig
        </label>
        <input
          type="text"
          name="client_action"
          defaultValue={project.client_action ?? ""}
          placeholder="Bijvoorbeeld: teksten voor de contactpagina"
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Laat leeg als je niets nodig hebt; het blok verdwijnt dan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Staging</label>
          <input
            type="url"
            name="staging_url"
            defaultValue={project.staging_url ?? ""}
            placeholder="https://"
            className="w-full px-3 py-2 rounded-md text-sm outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Live</label>
          <input
            type="url"
            name="live_url"
            defaultValue={project.live_url ?? ""}
            placeholder="https://"
            className="w-full px-3 py-2 rounded-md text-sm outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Budget excl. btw
        </label>
        <input
          type="number"
          name="budget_amount"
          step="0.01"
          min={0}
          defaultValue={project.budget_amount ?? ""}
          placeholder="0,00"
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Alleen voor jou. Staat niet in het klantportaal.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Type</label>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TAGS.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  border: `1px solid ${active ? "var(--text-heading)" : "var(--border)"}`,
                  background: active ? "var(--text-heading)" : "transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-xs px-3 py-2 rounded-md" style={{ background: "#fef2f2", color: "#e57373" }}>{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md text-sm" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          Annuleren
        </button>
        <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-md text-sm font-medium" style={{ background: "var(--text-heading)", color: "#fff", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
