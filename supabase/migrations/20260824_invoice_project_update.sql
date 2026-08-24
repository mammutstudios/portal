-- Facturen aan een project kunnen koppelen.
--
-- moneybird_invoices had alleen leesregels. Een update raakte daardoor nul
-- rijen zonder een fout te geven: op productie deed de knop "Koppelen"
-- zichtbaar niets. Lokaal viel dat niet op, want daar draait de service role
-- en die gaat langs row level security heen.

drop policy if exists "moneybird_invoices_admin_update" on moneybird_invoices;
create policy "moneybird_invoices_admin_update" on moneybird_invoices
  for update using (is_admin()) with check (is_admin());
