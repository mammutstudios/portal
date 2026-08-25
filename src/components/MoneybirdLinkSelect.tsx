"use client";

import { useTransition } from "react";
import SearchSelect from "@/components/SearchSelect";
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

  function onChange(next: string) {
    const fd = new FormData();
    fd.set("client_id", clientId);
    fd.set("moneybird_contact_id", next);
    startTransition(async () => {
      await linkMoneybirdContactAction(fd);
      onLinked?.();
    });
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ opacity: pending ? 0.5 : 1, pointerEvents: pending ? "none" : undefined }}
    >
      <SearchSelect
        name="moneybird_contact_id"
        placeholder="Niet gekoppeld"
        defaultValue={initial ?? undefined}
        options={[
          { value: "", label: "Niet gekoppeld" },
          ...options.map((o) => ({ value: o.id, label: o.label })),
        ]}
        onChange={(next) => onChange(next ?? "")}
      />
    </div>
  );
}
