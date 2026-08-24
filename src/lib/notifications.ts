/**
 * De soorten meldingen die een gebruiker kan aanzetten.
 *
 * Let op: dit legt alleen de voorkeur vast. Er is nog geen verzendkanaal —
 * zodra dat er is, leest dat deze waarden uit.
 */
export const NOTIFICATION_TYPES = [
  {
    key: "project_status",
    label: "Projectstatus wijzigt",
    description: "Als een project van status verandert, bijvoorbeeld naar Review of Afgerond.",
    default: true,
  },
  {
    key: "new_invoice",
    label: "Nieuwe factuur",
    description: "Zodra er een factuur wordt verstuurd.",
    default: true,
  },
  {
    key: "ticket_update",
    label: "Update op een ticket",
    description: "Als er iets verandert aan een ticket waar je bij betrokken bent.",
    default: false,
  },
] as const;

export type NotificationKey = (typeof NOTIFICATION_TYPES)[number]["key"];
export type NotificationPrefs = Partial<Record<NotificationKey, boolean>>;

/** Ontbrekende sleutel valt terug op de standaard hierboven. */
export function isEnabled(prefs: NotificationPrefs | null, key: NotificationKey): boolean {
  const type = NOTIFICATION_TYPES.find((t) => t.key === key);
  return prefs?.[key] ?? type?.default ?? false;
}
