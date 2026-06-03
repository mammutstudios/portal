"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretRight, EnvelopeSimple, Phone, Buildings } from "@phosphor-icons/react";
import Modal from "@/components/Modal";
import ContactForm from "@/components/ContactForm";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import type { Contact, Client } from "@/lib/types";

type ContactWithClient = Contact & {
  clients?: { id: string; name: string; logo_url: string | null; client_number: string | null } | null;
};

type ProjectRow = { id: string; title: string; status: string; client_id: string | null };

export default function ContactDetailClient({
  contact,
  clients,
  projects,
}: {
  contact: ContactWithClient;
  clients: Pick<Client, "id" | "name" | "logo_url" | "client_number">[];
  projects: ProjectRow[];
}) {
  const [showEdit, setShowEdit] = useState(false);
  const router = useRouter();
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

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
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

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">

        {/* Left: contact info card */}
        <div className="w-64 flex-shrink-0 rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {/* Klant */}
          {clientData ? (
            <Link
              href={`/dashboard/clients/${clientData.id}`}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)", color: "inherit", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
              >
                {clientData.logo_url ? (
                  /^https?|^\//.test(clientData.logo_url) ? (
                    <img src={clientData.logo_url} alt={clientData.name} className="w-full h-full object-contain" />
                  ) : (
                    <span style={{ fontSize: "12px" }}>{clientData.logo_url}</span>
                  )
                ) : (
                  <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)" }}>
                    {clientData.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium truncate" style={{ color: "var(--text-heading)" }}>{clientData.name}</span>
            </Link>
          ) : (
            <button
              onClick={() => setShowEdit(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ borderBottom: "1px solid var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <Buildings size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Klant koppelen</span>
            </button>
          )}

          {/* E-mail */}
          {contact.email && (
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: contact.phone ? "1px solid var(--border)" : "none" }}>
              <EnvelopeSimple size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <a href={`mailto:${contact.email}`} className="text-sm truncate hover:underline" style={{ color: "var(--text)" }}>
                {contact.email}
              </a>
            </div>
          )}

          {/* Telefoon */}
          {contact.phone && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Phone size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <a href={`tel:${contact.phone}`} className="text-sm hover:underline" style={{ color: "var(--text)" }}>
                {contact.phone}
              </a>
            </div>
          )}

          {!contact.email && !contact.phone && !clientData && (
            <p className="px-4 py-4 text-sm text-center" style={{ color: "var(--text-muted)" }}>Geen gegevens.</p>
          )}
        </div>

        {/* Right: projects */}
        <div className="flex-1">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>Projecten</h2>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {projects.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Project</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
                    <th className="w-8 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, i) => (
                    <tr
                      key={project.id}
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                      className="cursor-pointer"
                      style={{ borderBottom: i < projects.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--text-heading)" }}>
                        {project.title}
                      </td>
                      <td className="px-4 py-3">
                        <ProjectStatusBadge status={project.status as any} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CaretRight size={14} weight="bold" style={{ color: "var(--text-muted)" }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
                Geen projecten gekoppeld.
              </p>
            )}
          </div>
        </div>
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
