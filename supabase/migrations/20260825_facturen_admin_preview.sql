-- Facturen in de portaalpreview.
--
-- Elk portaalbeleid in 20260822_portal_rls.sql begint met is_admin(), zodat een
-- admin het portaal kan bekijken zoals de klant het ziet. Bij moneybird_invoices
-- ontbrak die tak als enige. Gevolg: my_client_ids() is voor een admin leeg, dus
-- in de preview verscheen de facturenkaart nooit, terwijl een echte klant zijn
-- facturen wél zag. De preview loog daarmee over wat de klant te zien krijgt.
--
-- Concepten blijven buiten beeld, ook voor een admin die het portaal bekijkt:
-- die zijn intern en heeft de klant nooit gezien. In het dashboard komen ze via
-- de service role wel gewoon binnen.

drop policy if exists "moneybird_invoices_portal_read" on moneybird_invoices;
create policy "moneybird_invoices_portal_read" on moneybird_invoices
  for select using (
    (is_admin() or client_id in (select my_client_ids()))
    and coalesce(state, '') <> 'draft'
  );

-- Controleren wat er nu staat:
--   select policyname, qual from pg_policies
--   where schemaname = 'public' and tablename = 'moneybird_invoices';
