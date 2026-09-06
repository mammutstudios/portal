"use client";

import { useState } from "react";
import { createClientAction } from "@/lib/actions/clients";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";

export default function CreateClientForm({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createClientAction(formData);

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
          Naam <span style={{ color: "#c0392b" }}>*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          autoFocus
          placeholder="Klantnaam"
          className="w-full px-3 py-2 text-sm rounded-md outline-none"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </div>

      <div>
        <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>
          E-mailadres
        </label>
        <input
          name="email"
          type="email"
          placeholder="klant@bedrijf.nl"
          className="w-full px-3 py-2 text-sm rounded-md outline-none"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </div>

      {error && <p className="text-sm" style={{ color: "#c0392b" }}>{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onClose}>
          Annuleren
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Opslaan…" : "Klant aanmaken"}
        </Button>
      </div>
    </form>
  );
}
