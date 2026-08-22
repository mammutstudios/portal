import { createClient } from "@/lib/supabase/server";
import { startPreviewAction } from "@/lib/actions/preview";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

export default async function KlantportaalPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: projects }, { data: members }] = await Promise.all([
    supabase.from("clients").select("id, name, logo_url").order("name"),
    supabase.from("projects").select("client_id"),
    supabase.from("client_members").select("client_id"),
  ]);

  // Tellingen per klant: laat zien of er überhaupt iets te bekijken valt en of
  // er al iemand van die organisatie toegang heeft tot het portaal.
  const projectCount = new Map<string, number>();
  for (const p of projects ?? []) {
    projectCount.set(p.client_id, (projectCount.get(p.client_id) ?? 0) + 1);
  }
  const memberCount = new Map<string, number>();
  for (const m of members ?? []) {
    memberCount.set(m.client_id, (memberCount.get(m.client_id) ?? 0) + 1);
  }

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Klantportaal
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Kies een organisatie om het portaal te bekijken zoals die klant het ziet.
      </p>

      {clients && clients.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map((c) => {
            const nProjects = projectCount.get(c.id) ?? 0;
            const nPeople = memberCount.get(c.id) ?? 0;
            return (
              <form key={c.id} action={startPreviewAction}>
                <input type="hidden" name="client_id" value={c.id} />
                <button
                  type="submit"
                  className="card-hover squircle w-full flex items-center gap-3 px-4 py-4 text-left group"
                  style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                  >
                    {c.logo_url ? (
                      /^https?|^\//.test(c.logo_url) ? (
                        <img src={c.logo_url} alt={c.name} className="w-full h-full object-contain" />
                      ) : (
                        <span style={{ fontSize: "1.125rem" }}>{c.logo_url}</span>
                      )
                    ) : (
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-heading)" }}>
                      {c.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {nProjects === 1 ? "1 project" : `${nProjects} projecten`}
                      {" · "}
                      {nPeople === 0
                        ? "geen portaaltoegang"
                        : nPeople === 1
                          ? "1 gebruiker"
                          : `${nPeople} gebruikers`}
                    </p>
                  </div>

                  <ArrowRight
                    size={16}
                    weight="bold"
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--text-muted)" }}
                  />
                </button>
              </form>
            );
          })}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Er zijn nog geen organisaties. Maak er eerst één aan onder CRM.
        </p>
      )}
    </div>
  );
}
