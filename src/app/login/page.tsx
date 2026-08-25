"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setStep("sent");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
      <div className="w-full max-w-sm">
        {/* Alles in één vlak: het merk hoort bij het formulier, niet erboven te
            zweven. Links uitgelijnd, want dat leest als een formulier. */}
        <div className="squircle p-6" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <img
              src="/brand/mammut-studios/mammut-beeldmerk.svg"
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 flex-shrink-0"
            />
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-heading)" }}>
              Mammut Portal
            </h1>
          </div>

          {step === "email" && (
            <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              Log in om verder te gaan
            </p>
          )}

          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="mt-6">
              <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>
                E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="jouw@email.com"
                className="w-full px-3 py-2 text-sm rounded-md outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />

              {error && <p className="mt-3 text-sm" style={{ color: "#c0392b" }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-2 px-4 text-sm font-medium rounded-md transition-opacity disabled:opacity-50"
                style={{ background: "var(--text-heading)", color: "#fff" }}
              >
                {loading ? "Versturen…" : "Stuur inloglink"}
              </button>
            </form>
          ) : (
            <div className="mt-6">
              {/* Het adres in een eigen vlakje: dat is het enige wat je hier
                  moet controleren, en als losse regel muted tekst viel het weg. */}
              <div
                className="squircle px-3 py-2.5"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Inloglink verstuurd naar
                </p>
                <p className="text-sm font-medium break-all" style={{ color: "var(--text-heading)" }}>
                  {email}
                </p>
              </div>

              <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
                Open de mail en klik op de knop om verder te gaan. De link werkt één keer en verloopt na een uur.
              </p>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(null); }}
                className="mt-6 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                ← Ander e-mailadres
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
