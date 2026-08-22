/**
 * Getoond wanneer een ingelogde gebruiker aan geen enkele klant gekoppeld is.
 * Zonder koppeling in client_members hoort iemand niets te zien.
 */
export default function PortalEmpty() {
  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Nog niets te zien
      </h1>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Je account is nog niet aan een klant gekoppeld. Neem contact met ons op, dan zetten we het klaar.
      </p>
    </div>
  );
}
