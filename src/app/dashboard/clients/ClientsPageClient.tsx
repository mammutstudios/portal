"use client";

import { useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import ClientForm from "@/components/ClientForm";
import { ClientTagBadge } from "@/components/StatusBadge";
import type { Client } from "@/lib/types";

export default function ClientsPageClient({ clients }: { clients: Client[] }) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
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

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {clients.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                <th className="w-20 px-4 py-2.5" />
                <th className="text-left pl-2 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Naam</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Type</th>
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
                      className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
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
                  <td className="px-4 py-3 text-right">
                    <CaretRight size={14} weight="bold" style={{ color: "var(--text-muted)" }} />
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
