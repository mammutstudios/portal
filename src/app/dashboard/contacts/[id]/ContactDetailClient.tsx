"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretRight, EnvelopeSimple, Phone } from "@phosphor-icons/react";
import Modal from "@/components/Modal";
import ContactForm from "@/components/ContactForm";
import type { Contact, Client } from "@/lib/types";

type ContactWithClient = Contact & {
  clients?: { id: string; name: string; logo_url: string | null; client_number: string | null } | null;
};

export default function ContactDetailClient({
  contact,
  clients,
}: {
  contact: ContactWithClient;
  clients: Pick<Client, "id" | "name" | "logo_url" | "client_number">[];
}) {
  const [showEdit, setShowEdit] = useState(false);

  const clientData = contact.clients;

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/contacts" className="hover:underline" style={{ color: "var(--text-muted)" }}>
          Contactpersonen
        </Link>
        {clientData && (
          <>
            <CaretRight size={12} weight="bold" />
            <Link href={`/dashboard/clients/${clientData.id}`} className="hover:underline" style={{ color: "var(--text-muted)" }}>
              {clientData.name}
            </Link>
          </>
        )}
        <CaretRight size={12} weight="bold" />
        <span style={{ color: "var(--text-heading)" }}>{contact.name}</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
            {contact.name}
          </h1>
          {contact.job_title && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{contact.job_title}</p>
          )}
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="text-sm px-3 py-1.5 rounded-md flex-shrink-0"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          Bewerken
        </button>
      </div>

      {/* Contact info */}
      <div className="rounded-lg overflow-hidden mb-8" style={{ border: "1px solid var(--border)" }}>
        {contact.email && (
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: contact.phone ? "1px solid var(--border)" : "none" }}>
            <EnvelopeSimple size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <a href={`mailto:${contact.email}`} className="text-sm hover:underline" style={{ color: "var(--text)" }}>
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Phone size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <a href={`tel:${contact.phone}`} className="text-sm hover:underline" style={{ color: "var(--text)" }}>
              {contact.phone}
            </a>
          </div>
        )}
        {!contact.email && !contact.phone && (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Geen contactgegevens.</p>
        )}
      </div>

      {/* Klant */}
      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>Klant</h2>
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {clientData ? (
          <Link
            href={`/dashboard/clients/${clientData.id}`}
            className="flex items-center justify-between px-4 py-3 transition-colors"
            style={{ color: "inherit", textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
              >
                {clientData.logo_url ? (
                  /^https?|^\//.test(clientData.logo_url) ? (
                    <img src={clientData.logo_url} alt={clientData.name} className="w-full h-full object-contain" />
                  ) : (
                    <span style={{ fontSize: "14px" }}>{clientData.logo_url}</span>
                  )
                ) : (
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)" }}>
                    {clientData.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{clientData.name}</p>
                {clientData.client_number && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{clientData.client_number}</p>
                )}
              </div>
            </div>
            <CaretRight size={14} weight="bold" style={{ color: "var(--text-muted)" }} />
          </Link>
        ) : (
          <div className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Geen klant gekoppeld.{" "}
            <button onClick={() => setShowEdit(true)} className="underline" style={{ color: "var(--text)" }}>
              Koppel een klant.
            </button>
          </div>
        )}
      </div>

      {showEdit && (
        <Modal title="Contactpersoon bewerken" onClose={() => setShowEdit(false)}>
          <ContactForm
            contact={contact}
            clients={clients as Client[]}
            onClose={() => setShowEdit(false)}
          />
        </Modal>
      )}
    </div>
  );
}
