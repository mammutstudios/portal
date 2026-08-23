"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction, updateNotificationPrefsAction } from "@/lib/actions/profile";
import { NOTIFICATION_TYPES, isEnabled, type NotificationPrefs } from "@/lib/notifications";
import type { Profile } from "@/lib/types";

export default function ProfileSettings({ profile, email }: { profile: Profile | null; email: string }) {
  const initialPrefs = (profile?.notification_prefs ?? null) as NotificationPrefs | null;
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t.key, isEnabled(initialPrefs, t.key)])),
  );
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  async function togglePref(key: string, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setPrefsSaved(false);
    setPrefsError(null);
    const result = await updateNotificationPrefsAction(next);
    if (result.error) {
      setPrefsError(result.error);
      setPrefs(prefs);
      return;
    }
    setPrefsSaved(true);
  }

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const fd = new FormData(e.currentTarget);
      await updateProfileAction(fd);
      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  }

  const initials = profile?.full_name?.charAt(0).toUpperCase() ?? email.charAt(0).toUpperCase();

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8" style={{ color: "var(--text-heading)" }}>
        Instellingen
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar */}
        <div>
          <label className="block text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>
            Profielfoto
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative group flex-shrink-0"
            >
              <div
                className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
                style={{ border: "2px solid var(--border)", background: "var(--bg-secondary)" }}
              >
                {preview ? (
                  <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold" style={{ color: "var(--text-heading)" }}>
                    {initials}
                  </span>
                )}
              </div>
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgb(20 0 24 / 0.4)" }}
              >
                <span className="text-white text-xs font-medium">Wijzig</span>
              </div>
            </button>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm px-3 py-1.5 rounded-md font-medium"
                style={{ border: "1px solid var(--border)", color: "var(--text)" }}
              >
                Foto uploaden
              </button>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                JPG, PNG of WebP. Max 2 MB.
              </p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            name="avatar"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Naam */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            Naam
          </label>
          <input
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
            required
            className="w-full px-3 py-2 rounded-md text-sm outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
          />
        </div>

        {/* E-mail (readonly) */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            E-mailadres
          </label>
          <input
            value={email}
            readOnly
            className="w-full px-3 py-2 rounded-md text-sm outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)" }}
          />
        </div>

        {error && (
          <p className="text-xs px-3 py-2 rounded-md" style={{ background: "#fef2f2", color: "#e57373" }}>
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs px-3 py-2 rounded-md" style={{ background: "#f0fdf4", color: "#16a34a" }}>
            Opgeslagen!
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{ background: "var(--text-heading)", color: "#fff", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Bezig..." : "Opslaan"}
          </button>
        </div>
      </form>

      {/* Meldingen */}
      <div className="mt-10 pt-8" style={{ borderTop: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-heading)" }}>
          Meldingen
        </h2>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          Waarover wil je bericht krijgen? Je keuze wordt meteen bewaard. Er wordt
          op dit moment nog niets verstuurd. Dit legt alleen vast wat je wilt
          ontvangen zodra dat aanstaat.
        </p>

        <div className="space-y-1">
          {NOTIFICATION_TYPES.map((type) => (
            <label
              key={type.key}
              className="card-hover flex items-start gap-3 px-3 py-3 rounded-md cursor-pointer"
            >
              <input
                type="checkbox"
                checked={prefs[type.key] ?? false}
                onChange={(e) => togglePref(type.key, e.target.checked)}
                className="mt-0.5 flex-shrink-0"
                style={{ accentColor: "var(--ink)" }}
              />
              <span>
                <span className="block text-sm" style={{ color: "var(--text-heading)" }}>
                  {type.label}
                </span>
                <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                  {type.description}
                </span>
              </span>
            </label>
          ))}
        </div>

        {prefsError && (
          <p className="text-xs mt-3 px-3 py-2 rounded-md" style={{ background: "#fef2f2", color: "#b0413e" }}>
            {prefsError}
          </p>
        )}
        {prefsSaved && !prefsError && (
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>Opgeslagen.</p>
        )}
      </div>
    </div>
  );
}
