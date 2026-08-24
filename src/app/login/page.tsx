"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
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

    setStep("otp");
    setLoading(false);
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      setError("Ongeldige code. Probeer opnieuw.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-4" style={{ background: "var(--text-heading)" }}>
            <span className="text-white text-sm font-semibold">M</span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-heading)" }}>
            Mammut Portal
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {step === "email" ? "Log in om verder te gaan" : `Code verstuurd naar ${email}`}
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
                {loading ? "Versturen…" : "Stuur code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>
                  Inlogcode
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  required
                  autoComplete="one-time-code"
                  placeholder="12345678"
                  className="w-full px-3 py-2 text-sm rounded-md outline-none tracking-widest text-center"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "1.2rem",
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
                {loading ? "Controleren…" : "Inloggen"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); setError(null); }}
                className="w-full text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                ← Ander e-mailadres
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
