import { redirect } from "next/navigation";

/**
 * De projectenlijst stond hier, maar staat niet meer in de navigatie. Klanten
 * landen na het inloggen op /portal, dus die sturen we door naar het overzicht.
 */
export default function PortalRoot() {
  redirect("/portal/overzicht");
}
