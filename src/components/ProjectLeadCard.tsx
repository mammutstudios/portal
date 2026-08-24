import { Envelope, Phone } from "@phosphor-icons/react/dist/ssr";

export type Lead = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * Wie dit project trekt, met een manier om hem te bereiken.
 *
 * Bewust met echte links: op een telefoon opent tel: de kiezer en mailto: de
 * mail, en dat is precies wat een klant hier wil doen.
 */
export default function ProjectLeadCard({ lead }: { lead: Lead }) {
  const naam = lead.full_name ?? "Naamloos";

  return (
    <div
      className="squircle p-5"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <div className="text-xs uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
        Je aanspreekpunt
      </div>

      <div className="flex items-center gap-3 mb-4">
        {lead.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lead.avatar_url}
            alt=""
            className="rounded-full object-cover flex-shrink-0"
            style={{ width: 48, height: 48 }}
          />
        ) : (
          <span
            className="rounded-full flex items-center justify-center flex-shrink-0 text-base font-semibold"
            style={{ width: 48, height: 48, background: "var(--bg-secondary)", color: "var(--text-muted)" }}
          >
            {naam.trim()[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        <span className="text-sm font-semibold min-w-0 truncate" style={{ color: "var(--text-heading)" }}>
          {naam}
        </span>
      </div>

      <div className="space-y-2">
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center gap-2 text-sm hover:underline min-w-0"
            style={{ color: "var(--text)" }}
          >
            <Envelope size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span className="truncate">{lead.email}</span>
          </a>
        )}
        {lead.phone && (
          <a
            href={`tel:${lead.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-2 text-sm hover:underline"
            style={{ color: "var(--text)" }}
          >
            <Phone size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            {lead.phone}
          </a>
        )}
      </div>
    </div>
  );
}
