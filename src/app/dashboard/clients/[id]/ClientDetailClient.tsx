"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { ProjectStatusBadge, ClientTagBadge } from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import ClientForm from "@/components/ClientForm";
import ContactForm from "@/components/ContactForm";
import { unlinkContactFromClientAction, linkContactToClientAction } from "@/lib/actions/contacts";
import SearchSelect from "@/components/SearchSelect";
import type { Client, Project, Contact } from "@/lib/types";

function LinkContactForm({ clientId, allContacts, linkedIds, onClose }: {
  clientId: string;
  allContacts: Contact[];
  linkedIds: string[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const available = allContacts.filter((c) => !linkedIds.includes(c.id));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("client_id", clientId);
    await linkContactToClientAction(fd);
    onClose();
  }

  if (available.length === 0) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
        Alle contactpersonen zijn al gekoppeld aan deze organisatie.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <SearchSelect
        name="contact_id"
        placeholder="Zoek een contactpersoon..."
        options={available.map((c) => ({ value: c.id, label: c.name, sublabel: c.job_title ?? undefined }))}
        required
      />
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md text-sm" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          Annuleren
        </button>
        <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-md text-sm font-medium" style={{ background: "var(--text-heading)", color: "#fff", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Bezig..." : "Koppelen"}
        </button>
      </div>
    </form>
  );
}

export default function ClientDetailClient({
  client,
  projects,
  contacts,
  allContacts,
}: {
  client: Client;
  projects: Project[];
  contacts: Contact[];
  allContacts: Contact[];
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showLinkContact, setShowLinkContact] = useState(false);
  const router = useRouter();

  const Chevron = () => (
    <CaretRight size={14} weight="bold" style={{ color: "var(--text-muted)" }} />
  );

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/clients" className="hover:underline" style={{ color: "var(--text-muted)" }}>
          Organisaties
        </Link>
        <CaretRight size={12} weight="bold" />
        <span style={{ color: "var(--text-heading)" }}>{client.name}</span>
      </nav>

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLinkContact(true)}
            className="text-xs px-2.5 py-1 rounded-md"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            Koppelen
          </button>
          <button
            onClick={() => setShowAddContact(true)}
            className="text-xs px-2.5 py-1 rounded-md"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            + Nieuw
          </button>
        </div>
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
                <tr
                  key={contact.id}
                  style={{ borderBottom: i < contacts.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--text-heading)" }}>
                    <button
                      onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
                      className="hover:underline text-left"
                    >
                      {contact.name}
                    </button>
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
                    <form action={unlinkContactFromClientAction} className="inline">
                      <input type="hidden" name="contact_id" value={contact.id} />
                      <input type="hidden" name="client_id" value={client.id} />
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded-md"
                        style={{ color: "var(--text-muted)" }}
                      >
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
                  className="cursor-pointer"
                  style={{ borderBottom: i < projects.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
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
            Geen projecten voor deze organisatie.
          </p>
        )}
      </div>

      {showEdit && (
        <Modal title="Organisatie bewerken" onClose={() => setShowEdit(false)}>
          <ClientForm client={client} onClose={() => setShowEdit(false)} />
        </Modal>
      )}

      {showAddContact && (
        <Modal title="Nieuw contactpersoon" onClose={() => setShowAddContact(false)}>
          <ContactForm initialClientId={client.id} onClose={() => setShowAddContact(false)} />
        </Modal>
      )}

      {showLinkContact && (
        <Modal title="Bestaand contactpersoon koppelen" onClose={() => setShowLinkContact(false)}>
          <LinkContactForm clientId={client.id} allContacts={allContacts} linkedIds={contacts.map((c) => c.id)} onClose={() => setShowLinkContact(false)} />
        </Modal>
      )}

    </div>
  );
}
