"use client";

import { useState, useTransition } from "react";
import { CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import ClientForm from "@/components/ClientForm";
import { ClientTagBadge } from "@/components/StatusBadge";
import type { Client } from "@/lib/types";
import { linkMoneybirdContactAction } from "@/lib/actions/moneybird";

type MoneybirdContactOption = { id: string; label: string };

/** Keuzelijst per klant. Stopt het klik-event, anders navigeert de rij eronder weg. */
function MoneybirdLink({
  client,
  options,
}: {
  client: Client & { moneybird_contact_id?: string | null };
  options: MoneybirdContactOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(client.moneybird_contact_id ?? "");

  function onChange(next: string) {
    setValue(next);
    const fd = new FormData();
    fd.set("client_id", client.id);
    fd.set("moneybird_contact_id", next);
    startTransition(() => linkMoneybirdContactAction(fd));
  }

  return (
    <select
      value={value}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className="squircle px-2 py-1.5 text-xs w-full max-w-[15rem]"
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

export default function ClientsPageClient({
  clients,
  moneybirdContacts = [],
}: {
  clients: Client[];
  moneybirdContacts?: MoneybirdContactOption[];
}) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const showMoneybird = moneybirdContacts.length > 0;

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          Organisaties <span className="text-2xl font-normal" style={{ color: "var(--text-muted)" }}>({clients.length})</span>
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          + Nieuwe organisatie
        </button>
      </div>
      <div className="mb-8" />

      <div className="squircle overflow-x-auto" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        {clients.length > 0 ? (
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <th className="w-20 px-4 py-2.5" />
                <th className="text-left pl-2 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Naam</th>
                <th className="text-left px-6 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Type</th>
                {showMoneybird && (
                  <th className="text-left px-6 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Moneybird</th>
                )}
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {clients.map((client, i) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                  className="cursor-pointer hover:bg-[#f7f7f5]"
                  style={{ borderBottom: i < clients.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <td className="px-4 py-3.5">
                    <div
                      className="w-12 h-12 squircle overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                    >
                      {client.logo_url ? (
                        /^https?|^\//.test(client.logo_url) ? (
                          <img src={client.logo_url} alt={client.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-2xl">{client.logo_url}</span>
                        )
                      ) : (
                        <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                          {client.client_number ?? client.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="pl-2 py-3.5 font-semibold" style={{ color: "var(--text-heading)" }}>
                    {client.name}
                  </td>
                  <td className="px-6 py-3.5">
                    {client.tag && <ClientTagBadge tag={client.tag} />}
                  </td>
                  {showMoneybird && (
                    <td className="px-6 py-3.5">
                      <MoneybirdLink client={client} options={moneybirdContacts} />
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <CaretRight size={15} weight="bold" style={{ color: "var(--text-muted)" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Nog geen organisaties.{" "}
            <button onClick={() => setShowModal(true)} className="underline" style={{ color: "var(--text)" }}>
              Maak de eerste aan.
            </button>
          </p>
        )}
      </div>

      {showModal && (
        <Modal title="Nieuwe organisatie" onClose={() => setShowModal(false)}>
          <ClientForm onClose={() => setShowModal(false)} />
        </Modal>
      )}
    </div>
  );
}
