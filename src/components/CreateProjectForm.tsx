"use client";

import { useState } from "react";
import { createProjectAction } from "@/lib/actions/projects";
import { quickCreateClientAction } from "@/lib/actions/clients";
import { useRouter } from "next/navigation";

const PROJECT_TAGS = ["Branding", "Design", "Development", "Retainer"];
import SearchSelect from "@/components/SearchSelect";
import type { Client } from "@/lib/types";

export default function CreateProjectForm({
  clients,
  onClose,
  defaultClientId,
}: {
  clients: Client[];
  onClose: () => void;
  defaultClientId?: string;
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createProjectAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>
          Projectnaam <span style={{ color: "#c0392b" }}>*</span>
        </label>
        <input
          name="title"
          type="text"
          required
          autoFocus
          placeholder="Naam van het project"
          className="w-full px-3 py-2 text-sm rounded-md outline-none"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </div>

      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>
          Klant <span style={{ color: "#c0392b" }}>*</span>
        </label>
        <SearchSelect
          name="client_id"
          required
          placeholder="Selecteer een klant"
          defaultValue={defaultClientId}
          options={clients.map((c) => ({
            value: c.id,
            label: c.name,
            sublabel: c.client_number ?? undefined,
          }))}
          onCreateNew={async (name) => {
            const result = await quickCreateClientAction(name);
            if ("error" in result) return null;
            return { value: result.id, label: result.name };
          }}
        />
      </div>

      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>
          Omschrijving
        </label>
        <textarea
          name="description"
          rows={3}
          placeholder="Optionele omschrijving"
          className="w-full px-3 py-2 text-sm rounded-md outline-none resize-none"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>
            Status
          </label>
          <select
            name="status"
            defaultValue="active"
            className="w-full px-3 py-2 text-sm rounded-md outline-none"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <option value="active">Actief</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Afgerond</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>
            Deadline
          </label>
          <input
            name="deadline"
            type="date"
            className="w-full px-3 py-2 text-sm rounded-md outline-none"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2" style={{ color: "var(--text)" }}>Tags</label>
        {selectedTags.map((tag) => (
          <input key={tag} type="hidden" name="tags" value={tag} />
        ))}
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

      {error && <p className="text-sm" style={{ color: "#c0392b" }}>{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="text-sm px-3 py-1.5" style={{ color: "var(--text-muted)" }}>
          Annuleren
        </button>
        <button
          type="submit"
          disabled={loading}
          className="text-sm px-4 py-1.5 rounded-md font-medium disabled:opacity-50"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          {loading ? "Opslaan…" : "Project aanmaken"}
        </button>
      </div>
    </form>
  );
}
