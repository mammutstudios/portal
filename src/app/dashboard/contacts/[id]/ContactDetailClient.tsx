"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretRight, EnvelopeSimple, Phone, X } from "@phosphor-icons/react";
import Modal from "@/components/Modal";
import ContactForm from "@/components/ContactForm";
import SearchSelect from "@/components/SearchSelect";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import { linkContactToClientAction, unlinkContactFromClientAction } from "@/lib/actions/contacts";
import type { Contact, Client } from "@/lib/types";

type LinkedClient = Pick<Client, "id" | "name" | "logo_url" | "client_number">;

type ContactWithClients = Contact & {
  contact_clients?: { clients: LinkedClient }[];
};

type ProjectRow = { id: string; title: string; status: string; client_id: string | null };

function AddClientForm({ contactId, allClients, linkedIds, onClose }: {
  contactId: string;
  allClients: LinkedClient[];
  linkedIds: string[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const available = allClients.filter((c) => !linkedIds.includes(c.id));

  if (available.length === 0) {
    return <p className="text-sm py-3 text-center" style={{ color: "var(--text-muted)" }}>Alle organisaties zijn al gekoppeld.</p>;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("contact_id", contactId);
    await linkContactToClientAction(fd);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <SearchSelect
        name="client_id"
        placeholder="Zoek een organisatie..."
        options={available.map((c) => ({ value: c.id, label: c.name, sublabel: c.client_number ?? undefined }))}
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

export default function ContactDetailClient({
  contact,
  clients,
  projects,
}: {
  contact: ContactWithClients;
  clients: LinkedClient[];
  projects: ProjectRow[];
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const router = useRouter();

  const linkedClients: LinkedClient[] = (contact.contact_clients ?? []).map((cc) => cc.clients).filter(Boolean);
  const linkedIds = linkedClients.map((c) => c.id);

  async function handleUnlink(clientId: string) {
    const fd = new FormData();
    fd.set("contact_id", contact.id);
    fd.set("client_id", clientId);
    await unlinkContactFromClientAction(fd);
    router.refresh();
  }

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/contacts" className="hover:underline" style={{ color: "var(--text-muted)" }}>
          Contactpersonen
        </Link>
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

        {/* Left: info card */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Contact details */}
          {(contact.email || contact.phone) && (
            <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
              {contact.email && (
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: contact.phone ? "1px solid var(--border)" : "none" }}>
                  <EnvelopeSimple size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <a href={`mailto:${contact.email}`} className="text-sm truncate hover:underline" style={{ color: "var(--text)" }}>
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
            </div>
          )}

          {/* Organisaties */}
          <div>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>Organisaties</h2>
            <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
              {linkedClients.length === 0 && (
                <p className="px-3 py-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>Geen organisaties gekoppeld.</p>
              )}
              {linkedClients.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-3 py-2.5 group"
                  style={{ borderBottom: i < linkedClients.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <Link
                    href={`/dashboard/clients/${c.id}`}
                    className="flex items-center gap-2 flex-1 min-w-0"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                    >
                      {c.logo_url ? (
                        /^https?|^\//.test(c.logo_url) ? (
                          <img src={c.logo_url} alt={c.name} className="w-full h-full object-contain" />
                        ) : (
                          <span style={{ fontSize: "10px" }}>{c.logo_url}</span>
                        )
                      ) : (
                        <span style={{ fontSize: "8px", fontWeight: 600, color: "var(--text-muted)" }}>
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm truncate" style={{ color: "var(--text-heading)" }}>{c.name}</span>
                  </Link>
                  <button
                    onClick={() => handleUnlink(c.id)}
                    className="opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0 p-0.5 rounded transition-opacity"
                    style={{ color: "var(--text-muted)" }}
                    title="Ontkoppelen"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ))}
            </div>

            {/* Dotted add card */}
            <button
              onClick={() => setShowAddClient(true)}
              className="w-full mt-2 px-3 py-2.5 rounded-lg text-sm text-center"
              style={{
                border: "1.5px dashed var(--border)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--text-muted)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              + Organisatie toevoegen
            </button>
          </div>
        </div>

        {/* Right: projects */}
        <div className="flex-1">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>Projecten</h2>
          <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
            {projects.length > 0 ? (
              <table className="w-full min-w-[640px]">
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
          <ContactForm contact={contact} onClose={() => setShowEdit(false)} />
        </Modal>
      )}

      {showAddClient && (
        <Modal title="Organisatie koppelen" onClose={() => setShowAddClient(false)}>
          <AddClientForm
            contactId={contact.id}
            allClients={clients}
            linkedIds={linkedIds}
            onClose={() => setShowAddClient(false)}
          />
        </Modal>
      )}
    </div>
  );
}
