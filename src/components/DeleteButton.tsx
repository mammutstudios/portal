"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Verwijderknop met een bevestigingsstap in de knop zelf. Bewust geen
 * browserdialoog: die blokkeert de pagina en oogt niet als de rest.
 */
export default function DeleteButton({
  label = "Verwijderen",
  confirmLabel = "Zeker weten?",
  onDelete,
  redirectTo,
}: {
  label?: string;
  confirmLabel?: string;
  /** Geeft een foutmelding terug wanneer verwijderen niet mag. */
  onDelete: () => Promise<{ error?: string } | void>;
  redirectTo?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run() {
    if (!armed) {
      setArmed(true);
      setError(null);
      return;
    }
    startTransition(async () => {
      const result = await onDelete();
      if (result && "error" in result && result.error) {
        setError(result.error);
        setArmed(false);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={run}
          disabled={pending}
          className="text-sm px-3 py-1.5 rounded-md"
          style={{
            border: `1px solid ${armed ? "#b0413e" : "var(--border)"}`,
            background: armed ? "#b0413e" : "transparent",
            color: armed ? "#fff" : "var(--text-muted)",
            opacity: pending ? 0.6 : 1,
            transition: "background 150ms, color 150ms, border-color 150ms",
          }}
        >
          {pending ? "Bezig…" : armed ? confirmLabel : label}
        </button>
        {armed && !pending && (
          <button
            onClick={() => setArmed(false)}
            className="text-sm px-2 py-1.5 rounded-md"
            style={{ color: "var(--text-muted)" }}
          >
            Annuleren
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs max-w-sm" style={{ color: "#b0413e" }}>{error}</p>
      )}
    </div>
  );
}
