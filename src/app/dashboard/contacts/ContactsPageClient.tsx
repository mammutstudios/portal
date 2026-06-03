"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";
import Modal from "@/components/Modal";
import ContactForm from "@/components/ContactForm";
import type { Contact, Client } from "@/lib/types";

type ContactWithClients = Contact & {
  contact_clients?: { clients: Pick<Client, "id" | "name" | "logo_url"> }[];
};

function ClientPill({ c }: { c: Pick<Client, "id" | "name" | "logo_url"> }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
      >
        {c.logo_url ? (
          /^https?|^\//.test(c.logo_url) ? (
            <img src={c.logo_url} alt={c.name} className="w-full h-full object-contain" />
          ) : (
            <span style={{ fontSize: "9px" }}>{c.logo_url}</span>
          )
        ) : (
          <span style={{ fontSize: "8px", fontWeight: 600, color: "var(--text-muted)" }}>
            {c.name.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span style={{ color: "var(--text-muted)" }}>{c.name}</span>
    </span>
  );
}

export default function ContactsPageClient({
  contacts,
  clients,
}: {
  contacts: ContactWithClients[];
  clients: Client[];
}) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          Contactpersonen <span className="text-2xl font-normal" style={{ color: "var(--text-muted)" }}>({contacts.length})</span>
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          + Nieuw contact
        </button>
      </div>
      <div className="mb-8" />

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {contacts.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Naam</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Klanten</th>
                <th className="w-8 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, i) => {
                const linkedClients = (contact.contact_clients ?? []).map((cc) => cc.clients).filter(Boolean);
                return (
                  <tr
                    key={contact.id}
                    onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
                    className="cursor-pointer"
                    style={{ borderBottom: i < contacts.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>{contact.name}</p>
                      {contact.job_title && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{contact.job_title}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {linkedClients.length > 0 ? (
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {linkedClients.map((c) => <ClientPill key={c.id} c={c} />)}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CaretRight size={14} weight="bold" style={{ color: "var(--text-muted)" }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Nog geen contactpersonen.{" "}
            <button onClick={() => setShowModal(true)} className="underline" style={{ color: "var(--text)" }}>
              Maak de eerste aan.
            </button>
          </p>
        )}
      </div>

      {showModal && (
        <Modal title="Nieuw contactpersoon" onClose={() => setShowModal(false)}>
          <ContactForm onClose={() => setShowModal(false)} />
        </Modal>
      )}
    </div>
  );
}
