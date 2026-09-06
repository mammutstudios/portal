"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Buildings,
  CalendarBlank,
  CircleDashed,
  Clock,
  Folder,
  User,
  Warning,
} from "@phosphor-icons/react";
import Select from "@/components/Select";
import SearchSelect from "@/components/SearchSelect";
import DatePicker from "@/components/DatePicker";
import ClientLogo from "@/components/ClientLogo";
import { updateTaskVeldAction } from "@/lib/actions/tasks";
import { TICKET_STATUS, TICKET_STATUS_ORDER } from "@/lib/tickets";
import type { Task, Project, Profile } from "@/lib/types";

type KlantOptie = { id: string; name: string; logo_url: string | null };

/**
 * Twee waarden, meer niet. Drie treden nodigen uit tot wikken en wegen over
 * iets wat maar één vraag beantwoordt: moet dit voor de rest? Normaal is de
 * standaard en daarom neutraal grijs; alleen Hoog hoort op te vallen, en dat
 * werkt alleen als de rest dat niet doet.
 *
 * Zelfde kleurafweging als bij de statussen in lib/tickets.ts: donkere tekst
 * op een lichte achtergrond, want de verzadigde kleur haalde het contrast niet.
 */
const PRIORITEIT = [
  {
    value: "medium",
    label: "Normaal",
    bg: "var(--bg-hover)",
    text: "var(--text)",
    border: "var(--border)",
  },
  { value: "high", label: "Hoog", bg: "#fecaca", text: "#7f1d1d", border: "#fca5a5" },
];

/**
 * De eigenschappen van een ticket, als lijst van regels.
 *
 * Elke regel is een icoon, een label en een waarde, en je past hem ter plekke
 * aan: klikken op de waarde maakt er het bijbehorende keuzeveld van, en zodra
 * je gekozen hebt gaat het weg naar de server en klapt de regel weer dicht.
 *
 * Er zit bewust geen opslaan-knop bij. Eén regel wijzigen is één handeling, en
 * een knop die je daarna nog moet indrukken is een tweede kans om het te
 * vergeten. Vandaar ook updateTaskVeldAction en niet het hele formulier: die
 * schrijft precies dit ene veld, zodat de rest niet meegestuurd hoeft te
 * worden en dus ook niet kan verdwijnen.
 */
export default function TicketEigenschappen({
  task,
  clients,
  projects,
  profiles,
}: {
  task: Task;
  clients: KlantOptie[];
  projects: Pick<Project, "id" | "title">[];
  /** Alleen team Mammut: een ticket is werk dat wij doen. Zie lib/team.ts. */
  profiles: Pick<Profile, "id" | "full_name" | "avatar_url">[];
}) {
  const router = useRouter();
  const [bezig, start] = useTransition();

  /** Welke regel staat open? Er kan er maar één tegelijk open staan. */
  const [open, setOpen] = useState<string | null>(null);

  function schrijf(veld: string, waarde: string) {
    setOpen(null);
    const fd = new FormData();
    fd.set("id", task.id);
    fd.set("veld", veld);
    fd.set("waarde", waarde);
    start(async () => {
      await updateTaskVeldAction(fd);
      router.refresh();
    });
  }

  const stijl = TICKET_STATUS[task.status] ?? TICKET_STATUS.open;
  const prioriteit = PRIORITEIT.find((p) => p.value === task.priority) ?? PRIORITEIT[0];
  const teLaat = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();

  const toegewezenWaarde = task.assigned_profile_id ?? undefined;
  // Een ticket van vóór deze regel kan nog op een contactpersoon staan; die
  // naam blijft leesbaar, maar kiezen kan alleen nog uit het team.
  const toegewezenNaam = task.profiles?.full_name ?? task.contacts?.name ?? null;

  return (
    <div style={{ opacity: bezig ? 0.6 : 1, transition: "opacity 150ms" }}>
      <Rij icoon={<CircleDashed size={16} />} label="Status" open={open === "status"} openBreedte="14rem">
        {open === "status" ? (
          <Select
            name="status"
            defaultValue={task.status}
            options={TICKET_STATUS_ORDER.map((s) => ({
              value: s,
              label: TICKET_STATUS[s].label,
              kleur: {
                bg: TICKET_STATUS[s].bg,
                text: TICKET_STATUS[s].text,
                border: TICKET_STATUS[s].border,
              },
            }))}
            onChange={(w) => schrijf("status", w)}
            startOpen
            subtle
            onSluiten={() => setOpen(null)}
          />
        ) : (
          <Waarde onClick={() => setOpen("status")}>
            <Chip bg={stijl.bg} text={stijl.text} border={stijl.border}>
              {stijl.label}
            </Chip>
          </Waarde>
        )}
      </Rij>

      <Rij icoon={<Buildings size={16} />} label="Klant" open={open === "client"} openBreedte="26rem">
        {open === "client" ? (
          <SearchSelect
            name="client_id"
            defaultValue={task.client_id ?? undefined}
            placeholder="Geen klant"
            showLogos
            options={clients.map((c) => ({ value: c.id, label: c.name, logo: c.logo_url }))}
            onChange={(w) => schrijf("client_id", w ?? "")}
            startOpen
            subtle
            onSluiten={() => setOpen(null)}
          />
        ) : (
          <Waarde onClick={() => setOpen("client")}>
            {task.clients?.name ? (
              <span className="flex items-center gap-2 min-w-0">
                <ClientLogo logo_url={task.clients.logo_url} name={task.clients.name} size="xs" />
                <span className="truncate">{task.clients.name}</span>
              </span>
            ) : (
              <Leeg />
            )}
          </Waarde>
        )}
      </Rij>

      <Rij icoon={<Folder size={16} />} label="Project" open={open === "project"} openBreedte="26rem">
        {open === "project" ? (
          <SearchSelect
            name="project_id"
            defaultValue={task.project_id ?? undefined}
            placeholder="Geen project"
            options={projects.map((p) => ({ value: p.id, label: p.title }))}
            onChange={(w) => schrijf("project_id", w ?? "")}
            startOpen
            subtle
            onSluiten={() => setOpen(null)}
          />
        ) : (
          <Waarde onClick={() => setOpen("project")}>
            {task.projects?.title ?? <Leeg />}
          </Waarde>
        )}
      </Rij>

      <Rij icoon={<User size={16} />} label="Toegewezen aan" open={open === "toegewezen"} openBreedte="22rem">
        {open === "toegewezen" ? (
          <SearchSelect
            name="toegewezen"
            defaultValue={toegewezenWaarde}
            placeholder="Niemand"
            showAvatars
            options={profiles.map((p) => ({
              value: p.id,
              label: p.full_name ?? "Onbekend",
              avatar: p.avatar_url,
            }))}
            onChange={(w) => schrijf("assigned_profile_id", w ?? "")}
            startOpen
            subtle
            onSluiten={() => setOpen(null)}
          />
        ) : (
          <Waarde onClick={() => setOpen("toegewezen")}>
            {toegewezenNaam ? (
              <span className="flex items-center gap-2 min-w-0">
                {task.profiles?.avatar_url ? (
                  <img
                    src={task.profiles.avatar_url}
                    alt={toegewezenNaam}
                    className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                    style={{ background: "var(--text-heading)" }}
                  >
                    {toegewezenNaam.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="truncate">{toegewezenNaam}</span>
              </span>
            ) : (
              <Leeg />
            )}
          </Waarde>
        )}
      </Rij>

      <Rij icoon={<Warning size={16} />} label="Prioriteit" open={open === "prioriteit"} openBreedte="14rem">
        {open === "prioriteit" ? (
          <Select
            name="priority"
            defaultValue={task.priority ?? "medium"}
            options={PRIORITEIT.map((p) => ({
              value: p.value,
              label: p.label,
              kleur: { bg: p.bg, text: p.text, border: p.border },
            }))}
            onChange={(w) => schrijf("priority", w)}
            startOpen
            subtle
            onSluiten={() => setOpen(null)}
          />
        ) : (
          <Waarde onClick={() => setOpen("prioriteit")}>
            <Chip bg={prioriteit.bg} text={prioriteit.text} border={prioriteit.border}>
              {prioriteit.label}
            </Chip>
          </Waarde>
        )}
      </Rij>

      <Rij icoon={<CalendarBlank size={16} />} label="Deadline" open={open === "deadline"}>
        {open === "deadline" ? (
          <DatePicker
            name="due_date"
            defaultValue={task.due_date ?? undefined}
            onChange={(w) => schrijf("due_date", w)}
            startOpen
            subtle
            onSluiten={() => setOpen(null)}
          />
        ) : (
          <Waarde onClick={() => setOpen("deadline")}>
            {task.due_date ? (
              <span style={{ color: teLaat ? "#dc2626" : undefined }}>
                {datum(task.due_date)}
              </span>
            ) : (
              <Leeg />
            )}
          </Waarde>
        )}
      </Rij>

      {/* Geschiedenis, dus niet aanpasbaar. Datum, tijd en wie het aanmaakte
          op één regel: los van elkaar waren het twee regels die altijd samen
          gelezen worden. */}
      <Rij icoon={<Clock size={16} />} label="Aangemaakt">
        <span className="px-2 py-1 text-sm" style={{ color: "var(--text-heading)" }}>
          {datum(task.created_at)} {tijd(task.created_at)}
          {task.created_by_profile?.full_name && (
            <span style={{ color: "color-mix(in srgb, var(--text-muted) 72%, var(--bg))" }}>
              {" door "}
              {task.created_by_profile.full_name}
            </span>
          )}
        </span>
      </Rij>
    </div>
  );
}

/** Alleen uren en minuten: seconden zeggen niets over wanneer iets gebeurde. */
function tijd(waarde: string) {
  return new Date(waarde).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function datum(waarde: string) {
  return new Date(waarde).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Rij({
  icoon,
  label,
  open,
  openBreedte = "18rem",
  children,
}: {
  icoon: React.ReactNode;
  label: string;
  open?: boolean;
  /**
   * Hoe breed het keuzeveld wordt als de regel openstaat. Per regel, want een
   * organisatienaam als "de Schepper Schilderwerken" heeft ruimte nodig die
   * een statuslabel van één woord alleen maar leeg laat staan.
   */
  openBreedte?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{
          width: "11rem",
          // Een tint lichter dan --text-muted: deze kolom is het register waar
          // je langs leest, niet wat je komt halen.
          color: "color-mix(in srgb, var(--text-muted) 72%, var(--bg))",
        }}
      >
        {icoon}
        <span className="text-sm">{label}</span>
      </div>
      {/* Vast breed zolang de regel dicht staat, zodat het keuzeveld dat
          eroverheen komt niet ineens de hele regel opblaast. */}
      {/* Vaste hoogte: een keuzeveld is hoger dan de tekst die er stond, en
          zonder deze ondergrens schuift de hele lijst op zodra je er een
          opent. Vast breed zolang de regel dicht staat, zodat het veld dat
          eroverheen komt de regel ook niet breder maakt. */}
      <div
        className="min-w-0 flex items-center"
        style={{ flex: open ? `0 0 ${openBreedte}` : "1 1 auto", height: "2.125rem" }}
      >
        {/* Dit omhulsel is er om de breedte hierboven ook echt door te geven.
            De cel eromheen is een flexrij, en een keuzeveld is daarin een
            flexitem dat naar zijn inhoud krimpt: zonder deze w-full werd de
            dropdown net zo smal als de naam die erin stond. */}
        <div className="w-full min-w-0">{children}</div>
      </div>
    </div>
  );
}

/**
 * Een waarde die je kunt aanklikken om hem te wijzigen.
 *
 * Ziet er tot die klik uit als gewone tekst; pas als je erover gaat licht het
 * vlak op. Dat is wat het onderscheidt van een formulier: je leest een pagina,
 * en pas als je iets wil veranderen gedraagt hij zich als een veld.
 */
function Waarde({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-2 py-1 rounded-md text-sm flex items-center min-w-0"
      style={{ color: "var(--text-heading)", transition: "background 120ms" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {children}
    </button>
  );
}

function Leeg() {
  return <span style={{ color: "var(--text-muted)" }}>Leeg</span>;
}

function Chip({
  bg,
  text,
  border,
  children,
}: {
  bg: string;
  text: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: bg, color: text, border: `1px solid ${border}` }}
    >
      {children}
    </span>
  );
}
