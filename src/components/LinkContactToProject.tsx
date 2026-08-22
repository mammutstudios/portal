"use client";

import { useState } from "react";
import { addContactToProjectAction, removeContactFromProjectAction } from "@/lib/actions/contacts";
import type { Contact, ProjectContact } from "@/lib/types";

export default function LinkContactToProject({
  projectId,
  clientContacts,
  linkedContacts,
}: {
  projectId: string;
  clientContacts: Contact[];
  linkedContacts: ProjectContact[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const linkedIds = new Set(linkedContacts.map((lc) => lc.contact_id));
  const available = clientContacts.filter((c) => !linkedIds.has(c.id));

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
          Contactpersonen
        </h2>
        {available.length > 0 && (
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="text-xs px-2.5 py-1 rounded-md"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            + Koppelen
          </button>
        )}
      </div>

      {showPicker && available.length > 0 && (
        <div
          className="rounded-lg mb-3 p-3 space-y-1"
          style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
        >
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            Kies een contactpersoon van deze klant:
          </p>
          {available.map((contact) => (
            <form key={contact.id} action={addContactToProjectAction}>
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="contact_id" value={contact.id} />
              <button
                type="submit"
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-[#f1f1ef] transition-colors"
                style={{ color: "var(--text)" }}
                onClick={() => setShowPicker(false)}
              >
                <span className="font-medium">{contact.name}</span>
              </button>
            </form>
          ))}
        </div>
      )}

      <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        {linkedContacts.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Naam</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>E-mail</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {linkedContacts.map((lc, i) => (
                <tr key={lc.id} style={{ borderBottom: i < linkedContacts.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--text-heading)" }}>
                    {lc.contacts?.name}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {lc.contacts?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={removeContactFromProjectAction} className="inline">
                      <input type="hidden" name="project_id" value={projectId} />
                      <input type="hidden" name="contact_id" value={lc.contact_id} />
                      <button type="submit" className="text-xs px-2 py-1 rounded-md" style={{ color: "var(--text-muted)" }}>
                        Ontkoppelen
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Nog geen contactpersonen gekoppeld.
          </p>
        )}
      </div>
    </section>
  );
}
