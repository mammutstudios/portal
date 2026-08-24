import { isMoneybirdConfigured } from "@/lib/moneybird/client";
import { createClient } from "@/lib/supabase/server";
import { fetchRecurringAgreements } from "@/lib/moneybird/recurring";
import PeriodiekPageClient from "./PeriodiekPageClient";

export default async function PeriodiekPage() {
  const supabase = await createClient();
  const recurring = await fetchRecurringAgreements(supabase);

  return <PeriodiekPageClient configured={isMoneybirdConfigured()} recurring={recurring} />;
}
