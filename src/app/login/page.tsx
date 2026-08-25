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
        <div className="mb-8 text-center">
          <img src="/icon.png" alt="" width={40} height={40} className="inline-block w-10 h-10 mb-4" />
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-heading)" }}>
            Mammut Portal
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {step === "email" ? "Log in om verder te gaan" : `Inloglink verstuurd naar ${email}`}
          </p>
        </div>

        <div className="squircle p-6" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
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
              </div>

              {error && <p className="text-sm" style={{ color: "#c0392b" }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 text-sm font-medium rounded-md transition-opacity disabled:opacity-50"
                style={{ background: "var(--text-heading)", color: "#fff" }}
              >
                {loading ? "Versturen…" : "Stuur inloglink"}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm" style={{ color: "var(--text)" }}>
                Open de mail en klik op de knop om verder te gaan. De link werkt één keer en verloopt na een uur.
              </p>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(null); }}
                className="w-full text-sm"
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
