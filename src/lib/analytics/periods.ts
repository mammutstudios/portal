import type { Range } from "@/lib/analytics/plausible";

/**
 * De periodes uit het Plausible-dashboard. Ik reken de datums zelf uit in
 * plaats van hun kortschrift te gebruiken, omdat ik daarmee ook de vórige
 * periode van dezelfde lengte kan bepalen — de API kent geen vergelijking.
 *
 * De grenzen zijn nagemeten tegen de kortschriften van de API, want ze zijn
 * niet allemaal even vanzelfsprekend: de rollende periodes (7d/28d/91d)
 * eindigen gisteren en laten vandaag er dus buiten, terwijl "deze maand" en
 * "dit jaar" tot en met vandaag lopen. "12mo" is twaalf héle maanden vóór de
 * huidige. Wijk hier niet van af zonder opnieuw te meten — anders wijken de
 * cijfers in het portal zichtbaar af van die in Plausible zelf.
 */
export const PERIODS = [
  { key: "day", label: "Vandaag" },
  { key: "7d", label: "Laatste 7 dagen" },
  { key: "28d", label: "Laatste 28 dagen" },
  { key: "91d", label: "Laatste 91 dagen" },
  { key: "month", label: "Deze maand" },
  { key: "lastmonth", label: "Vorige maand" },
  { key: "year", label: "Dit jaar" },
  { key: "12mo", label: "Laatste 12 maanden" },
  { key: "all", label: "Alles" },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];

export function isPeriod(v: string | undefined): v is PeriodKey {
  return !!v && PERIODS.some((p) => p.key === v);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export type Resolved = {
  range: Range;
  /** Zelfde lengte, direct ervoor. Null bij "alles": daar valt niets mee te vergelijken. */
  previous: Range | null;
  /** Bij lange periodes per maand groeperen, anders wordt de grafiek onleesbaar. */
  interval: "time:day" | "time:month";
  label: string;
};

export function resolvePeriod(key: PeriodKey, now = new Date()): Resolved {
  const label = PERIODS.find((p) => p.key === key)?.label ?? "";
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000);

  const span = (from: Date, to: Date): Resolved => {
    const lengte = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
    const vorigeTot = new Date(from.getTime() - 86_400_000);
    const vorigeVan = new Date(vorigeTot.getTime() - (lengte - 1) * 86_400_000);
    return {
      range: [iso(from), iso(to)],
      previous: [iso(vorigeVan), iso(vorigeTot)],
      interval: lengte > 92 ? "time:month" : "time:day",
      label,
    };
  };

  switch (key) {
    case "day":
      return span(today, today);
    case "7d":
      return span(daysAgo(7), daysAgo(1));
    case "28d":
      return span(daysAgo(28), daysAgo(1));
    case "91d":
      return span(daysAgo(91), daysAgo(1));
    case "month":
      return span(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)), today);
    case "lastmonth": {
      const van = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
      const tot = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));
      return span(van, tot);
    }
    case "year":
      return span(new Date(Date.UTC(now.getFullYear(), 0, 1)), today);
    case "12mo": {
      const van = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 12, 1));
      const tot = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));
      return span(van, tot);
    }
    case "all":
      return {
        // Ruim genomen; Plausible kapt zelf af op de eerste meting.
        range: [iso(new Date(Date.UTC(2015, 0, 1))), iso(today)],
        previous: null,
        interval: "time:month",
        label,
      };
  }
}
