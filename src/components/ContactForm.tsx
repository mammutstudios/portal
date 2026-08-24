"use client";

import { useRef } from "react";
import { createContactAction, updateContactAction } from "@/lib/actions/contacts";
import type { Contact } from "@/lib/types";

export default function ContactForm({
  contact,
  initialClientId,
  onClose,
  columns = 1,
}: {
  contact?: Contact;
  initialClientId?: string;
  onClose: () => void;
  /** Twee kolommen alleen waar het breed genoeg is; in een modal blijft 1 beter. */
  columns?: 1 | 2;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const action = contact ? updateContactAction : createContactAction;

  async function handleSubmit(formData: FormData) {
    await action(formData);
    onClose();
  }

  return (
    <form ref={ref} action={handleSubmit} className="space-y-3">
      {contact && <input type="hidden" name="id" value={contact.id} />}
      {initialClientId && <input type="hidden" name="client_id" value={initialClientId} />}

      <div className={columns === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Naam *
        </label>
        <input
          name="name"
          required
          defaultValue={contact?.name}
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          E-mail
        </label>
        <input
          name="email"
          type="email"
          defaultValue={contact?.email ?? ""}
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Telefoon
        </label>
        <input
          name="phone"
          defaultValue={contact?.phone ?? ""}
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
      </div>

      </div>

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
          className="px-3 py-1.5 rounded-md text-sm font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          {contact ? "Opslaan" : "Aanmaken"}
        </button>
      </div>
    </form>
  );
}
