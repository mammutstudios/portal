import { CheckCircle, DownloadSimple, XCircle, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import CopyValue from "./CopyValue";
import ColorSwatch from "./ColorSwatch";
import MotionSample from "./MotionSample";
import SectionNav, { type BrandSection } from "./SectionNav";
import { shortDate } from "@/lib/portal";
import type { BrandGuide } from "@/lib/brand/types";

const PANGRAM = "Wazig bidprentje vol quotes dankt chef Xavy.";

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    // De marge boven houdt de kop vrij van de plakkende sectiebalk bij het
    // springen naar een anker.
    <section id={id} className="mb-14" style={{ scrollMarginTop: "4.5rem" }}>
      <h2 className="text-2xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        {title}
      </h2>
      {intro && (
        <p className="text-sm mb-5 max-w-2xl" style={{ color: "var(--text)" }}>
          {intro}
        </p>
      )}
      {children}
    </section>
  );
}

function Kaart({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`squircle ${className}`}
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {children}
    </div>
  );
}

export default function BrandGuideView({ guide }: { guide: BrandGuide }) {
  const sections: BrandSection[] = [
    guide.intro && { id: "introductie", label: "Introductie" },
    guide.logos && { id: "logo", label: "Logo" },
    guide.colors && { id: "kleur", label: "Kleur" },
    guide.typography && { id: "typografie", label: "Typografie" },
    guide.motion && { id: "motion", label: "Motion" },
    guide.applications && { id: "toepassingen", label: "Toepassingen" },
    guide.social && { id: "social", label: "Social media" },
    guide.assets && { id: "assets", label: "Assets" },
  ].filter(Boolean) as BrandSection[];

  const proef = guide.typography?.sample ?? PANGRAM;
  const basisFont = guide.typography?.fonts?.[0]?.stack;

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
          Huisstijl
        </p>
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
          {guide.brandName}
        </h1>
        {guide.tagline && (
          <p className="text-sm" style={{ color: "var(--text)" }}>
            {guide.tagline}
          </p>
        )}
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Bijgewerkt op {shortDate(guide.updatedAt)}
        </p>
      </header>

      <SectionNav sections={sections} />

      {guide.intro && (
        <Section id="introductie" title="Introductie">
          <div className="max-w-2xl space-y-3 mb-6">
            {guide.intro.body.map((p, i) => (
              <p key={i} className="text-sm" style={{ color: "var(--text)" }}>
                {p}
              </p>
            ))}
          </div>
          {guide.intro.values && guide.intro.values.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {guide.intro.values.map((v) => (
                <Kaart key={v.title} className="p-4">
                  <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-heading)" }}>
                    {v.title}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {v.body}
                  </p>
                </Kaart>
              ))}
            </div>
          )}
        </Section>
      )}

      {guide.logos && (
        <Section id="logo" title="Logo" intro={guide.logos.intro}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guide.logos.variants.map((v) => (
              <Kaart key={v.name} className="overflow-hidden">
                <div
                  className="flex items-center justify-center px-6"
                  style={{
                    background: v.background ?? "var(--bg-secondary)",
                    height: "11rem",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.src}
                    alt={v.name}
                    style={{ width: v.width ?? "12rem", maxWidth: "100%", height: "auto" }}
                  />
                </div>
                <div className="px-4 py-3">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                    {v.name}
                  </h3>
                  {v.usage && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {v.usage}
                    </p>
                  )}
                  {v.downloads && v.downloads.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {v.downloads.map((d) => (
                        <a
                          key={d.href}
                          href={d.href}
                          download
                          className="card-hover inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                          style={{ background: "var(--bg-secondary)", color: "var(--text-heading)" }}
                        >
                          <DownloadSimple size={12} weight="bold" />
                          {d.format ?? "Download"}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </Kaart>
            ))}
          </div>

          {(guide.logos.rules?.do?.length || guide.logos.rules?.dont?.length) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {guide.logos.rules?.do && guide.logos.rules.do.length > 0 && (
                <Kaart className="p-4">
                  <h3 className="text-sm font-semibold mb-2.5" style={{ color: "var(--text-heading)" }}>
                    Wel doen
                  </h3>
                  <ul className="space-y-2">
                    {guide.logos.rules.do.map((r) => (
                      <li key={r} className="flex gap-2 text-xs" style={{ color: "var(--text)" }}>
                        <CheckCircle size={15} weight="fill" style={{ flexShrink: 0, marginTop: 1 }} />
                        {r}
                      </li>
                    ))}
                  </ul>
                </Kaart>
              )}
              {guide.logos.rules?.dont && guide.logos.rules.dont.length > 0 && (
                <Kaart className="p-4">
                  <h3 className="text-sm font-semibold mb-2.5" style={{ color: "var(--text-heading)" }}>
                    Niet doen
                  </h3>
                  <ul className="space-y-2">
                    {guide.logos.rules.dont.map((r) => (
                      <li key={r} className="flex gap-2 text-xs" style={{ color: "var(--text)" }}>
                        <XCircle size={15} weight="fill" style={{ flexShrink: 0, marginTop: 1, opacity: 0.5 }} />
                        {r}
                      </li>
                    ))}
                  </ul>
                </Kaart>
              )}
            </div>
          )}

          {guide.logos.notes && guide.logos.notes.length > 0 && (
            <ul className="mt-4 space-y-1">
              {guide.logos.notes.map((n) => (
                <li key={n} className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {n}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {guide.colors && (
        <Section id="kleur" title="Kleur" intro={guide.colors.intro}>
          <div className="space-y-6">
            {guide.colors.groups.map((groep) => (
              <div key={groep.title}>
                <h3 className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-heading)" }}>
                  {groep.title}
                </h3>
                {groep.description && (
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                    {groep.description}
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {groep.colors.map((c) => (
                    <ColorSwatch key={c.hex + c.name} color={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {guide.typography && (
        <Section id="typografie" title="Typografie" intro={guide.typography.intro}>
          <div className="space-y-4">
            {guide.typography.fonts.map((f) => (
              <Kaart key={f.name} className="p-5">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="text-lg font-semibold" style={{ color: "var(--text-heading)" }}>
                    {f.name}
                  </h3>
                  {f.source &&
                    (f.source.href ? (
                      <a
                        href={f.source.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs hover:underline"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {f.source.label}
                        <ArrowSquareOut size={12} weight="bold" />
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {f.source.label}
                      </span>
                    ))}
                </div>
                {f.usage && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {f.usage}
                  </p>
                )}

                <p
                  className="mt-4"
                  style={{ fontFamily: f.stack, fontSize: "2rem", lineHeight: 1.2, color: "var(--text-heading)" }}
                >
                  {proef}
                </p>

                {f.weights && f.weights.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {f.weights.map((w) => (
                      <div key={w.value} className="flex items-baseline gap-4">
                        <span className="text-xs w-24 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                          {w.label} {w.value}
                        </span>
                        <span
                          className="truncate"
                          style={{ fontFamily: f.stack, fontWeight: w.value, color: "var(--text-heading)" }}
                        >
                          {proef}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <CopyValue value={f.stack} label="font-family" />
                </div>
              </Kaart>
            ))}

            {guide.typography.scale && guide.typography.scale.length > 0 && (
              <Kaart>
                {guide.typography.scale.map((s, i) => (
                  <div
                    key={s.label}
                    className="px-5 py-4"
                    style={{
                      borderBottom:
                        i < guide.typography!.scale!.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-heading)" }}>
                        {s.label}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {[s.size, s.weight ? `gewicht ${s.weight}` : null, s.lineHeight ? `regel ${s.lineHeight}` : null]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                    <p
                      className="truncate"
                      style={{
                        fontFamily: s.font ?? basisFont,
                        fontSize: s.size,
                        lineHeight: s.lineHeight,
                        fontWeight: s.weight,
                        letterSpacing: s.letterSpacing,
                        color: "var(--text-heading)",
                      }}
                    >
                      {proef}
                    </p>
                    {s.usage && (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {s.usage}
                      </p>
                    )}
                  </div>
                ))}
              </Kaart>
            )}
          </div>
        </Section>
      )}

      {guide.motion && (
        <Section id="motion" title="Motion" intro={guide.motion.intro}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guide.motion.items.map((m) => (
              <MotionSample key={m.name} item={m} />
            ))}
          </div>
        </Section>
      )}

      {guide.applications && (
        <Section id="toepassingen" title="Toepassingen" intro={guide.applications.intro}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guide.applications.items.map((a) => (
              <Kaart key={a.name} className="overflow-hidden">
                {a.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.image}
                    alt={a.name}
                    className="w-full"
                    style={{ display: "block", borderBottom: "1px solid var(--border)" }}
                  />
                )}
                <div className="px-4 py-3">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                    {a.name}
                  </h3>
                  {a.description && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {a.description}
                    </p>
                  )}
                </div>
              </Kaart>
            ))}
          </div>
        </Section>
      )}

      {guide.social && (
        <Section id="social" title="Social media" intro={guide.social.intro}>
          <Kaart>
            {guide.social.items.map((s, i) => (
              <div
                key={s.platform}
                className="px-5 py-4"
                style={{
                  borderBottom: i < guide.social!.items.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                    {s.platform}
                  </span>
                  {s.handle &&
                    (s.href ? (
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs hover:underline"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {s.handle}
                        <ArrowSquareOut size={12} weight="bold" />
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {s.handle}
                      </span>
                    ))}
                </div>
                {s.guidance && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {s.guidance}
                  </p>
                )}
              </div>
            ))}
          </Kaart>
        </Section>
      )}

      {guide.assets && (
        <Section id="assets" title="Assets" intro={guide.assets.intro}>
          <Kaart>
            {guide.assets.items.map((a, i) => (
              <a
                key={a.href}
                href={a.href}
                download
                className="card-hover flex items-center justify-between gap-4 px-5 py-3.5"
                style={{
                  borderBottom: i < guide.assets!.items.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span>
                  <span className="block text-sm font-medium" style={{ color: "var(--text-heading)" }}>
                    {a.name}
                  </span>
                  {a.description && (
                    <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                      {a.description}
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-2 text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {a.format}
                  <DownloadSimple size={15} weight="bold" />
                </span>
              </a>
            ))}
          </Kaart>
        </Section>
      )}
    </div>
  );
}
