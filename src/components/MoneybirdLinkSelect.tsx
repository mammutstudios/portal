"use client";

import { useState, useTransition } from "react";
import { linkMoneybirdContactAction } from "@/lib/actions/moneybird";

export type MoneybirdContactOption = { id: string; label: string };

/**
 * Koppelt een organisatie aan een relatie in Moneybird. Eenmalig per klant:
 * daarna matchen facturen op id in plaats van op naam, ook via de webhook.
 */
export default function MoneybirdLinkSelect({
  clientId,
  value: initial,
  options,
  onLinked,
}: {
  clientId: string;
  value: string | null;
  options: MoneybirdContactOption[];
  onLinked?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(initial ?? "");

  function onChange(next: string) {
    setValue(next);
    const fd = new FormData();
    fd.set("client_id", clientId);
    fd.set("moneybird_contact_id", next);
    startTransition(async () => {
      await linkMoneybirdContactAction(fd);
      onLinked?.();
    });
  }

  return (
    <select
      value={value}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className="squircle px-2.5 py-2 text-sm w-full max-w-sm"
      style={{
        border: "1px solid var(--border)",
        background: "var(--bg)",
        color: value ? "var(--text-heading)" : "var(--text-muted)",
        opacity: pending ? 0.5 : 1,
      }}
    >
      <option value="">Niet gekoppeld</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}
