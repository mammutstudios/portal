"use client";

import { useState, useTransition } from "react";
import { linkPlausibleSiteAction } from "@/lib/actions/clients";

/** Domein zoals het in Plausible staat. Eenmalig per organisatie. */
export default function PlausibleSiteField({
  clientId,
  value: initial,
}: {
  clientId: string;
  value: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    setError(null);
    const fd = new FormData();
    fd.set("id", clientId);
    fd.set("plausible_site_id", value);
    startTransition(async () => {
      const result = await linkPlausibleSiteAction(fd);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2 max-w-sm">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          onBlur={save}
          placeholder="bijv. mammutstudios.com"
          className="squircle px-2.5 py-2 text-sm flex-1"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", opacity: pending ? 0.5 : 1 }}
        />
        <button
          onClick={save}
          disabled={pending}
          className="text-sm px-3 py-2 rounded-md flex-shrink-0"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          {pending ? "Bezig…" : "Opslaan"}
        </button>
      </div>
      {error && <p className="text-xs mt-2" style={{ color: "#b0413e" }}>{error}</p>}
      {saved && !error && <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Opgeslagen.</p>}
    </div>
  );
}
