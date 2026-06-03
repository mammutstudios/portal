"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { ProjectStatusBadge, ClientTagBadge } from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import ClientForm from "@/components/ClientForm";
import ContactForm from "@/components/ContactForm";
import { deleteContactAction } from "@/lib/actions/contacts";
import type { Client, Project, Contact } from "@/lib/types";

export default function ClientDetailClient({
  client,
  projects,
  contacts,
}: {
  client: Client;
  projects: Project[];
  contacts: Contact[];
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const router = useRouter();

  const Chevron = () => (
    <CaretRight size={14} weight="bold" style={{ color: "var(--text-muted)" }} />
  );

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <Link href="/dashboard/clients" className="text-sm mb-6 inline-block" style={{ color: "var(--text-muted)" }}>
        ← Klanten
      </Link>

      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
          >
            {client.logo_url ? (
              /^https?|^\//.test(client.logo_url) ? (
                <img src={client.logo_url} alt={client.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl">{client.logo_url}</span>
              )
            ) : (
              <span className="text-lg font-semibold" style={{ color: "var(--text-muted)" }}>
                {client.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
              {client.name}
            </h1>
            {client.client_number && (
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>{client.client_number}</span>
            )}
            {client.tag && <ClientTagBadge tag={client.tag} />}
          </div>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="text-sm px-3 py-1.5 rounded-md"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          Bewerken
        </button>
      </div>

      {client.email && (
        <p className="text-sm mb-1 mt-1" style={{ color: "var(--text-muted)" }}>{client.email}</p>
      )}
      {client.slug && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>/{client.slug}</p>
      )}
      <div className="mb-8" />

      {/* Contactpersonen */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
          Contactpersonen
        </h2>
        <button
          onClick={() => setShowAddContact(true)}
          className="text-xs px-2.5 py-1 rounded-md"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          + Toevoegen
        </button>
      </div>

      <div className="rounded-lg overflow-hidden mb-8" style={{ border: "1px solid var(--border)" }}>
        {contacts.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Naam</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Functie</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>E-mail</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Telefoon</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, i) => (
                <tr key={contact.id} style={{ borderBottom: i < contacts.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--text-heading)" }}>
                    {contact.name}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {contact.job_title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {contact.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {contact.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditContact(contact)}
                      className="text-xs px-2 py-1 rounded-md mr-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Bewerken
                    </button>
                    <form action={deleteContactAction} className="inline">
                      <input type="hidden" name="id" value={contact.id} />
                      <input type="hidden" name="client_id" value={client.id} />
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded-md"
                        style={{ color: "#e57373" }}
                      >
                        Verwijderen
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Nog geen contactpersonen.
          </p>
        )}
      </div>

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>
        Projecten
      </h2>

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
                  className="cursor-pointer hover:bg-[#f7f7f5]"
                  style={{ borderBottom: i < projects.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-heading)" }}>
                    {project.title}
                  </td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Chevron />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Geen projecten voor deze klant.
          </p>
        )}
      </div>

      {showEdit && (
        <Modal title="Klant bewerken" onClose={() => setShowEdit(false)}>
          <ClientForm client={client} onClose={() => setShowEdit(false)} />
        </Modal>
      )}

      {showAddContact && (
        <Modal title="Contactpersoon toevoegen" onClose={() => setShowAddContact(false)}>
          <ContactForm clientId={client.id} projects={projects} onClose={() => setShowAddContact(false)} />
        </Modal>
      )}

      {editContact && (
        <Modal title="Contactpersoon bewerken" onClose={() => setEditContact(null)}>
          <ContactForm clientId={client.id} contact={editContact} onClose={() => setEditContact(null)} />
        </Modal>
      )}
    </div>
  );
}
