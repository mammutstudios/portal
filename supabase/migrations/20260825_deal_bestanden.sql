-- Bestanden bij een deal, en een privébucket om ze in te zetten.
--
-- De bestaande files-tabel hing vast aan een project. Een briefing komt binnen
-- vóór er een project is, dus project_id wordt optioneel en er komt een deal_id
-- naast. Eén tabel voor allebei, want bij het omzetten van een deal hoort de
-- briefing gewoon mee te verhuizen naar het project: dan zet je project_id erbij
-- en blijft deal_id staan als herkomst.
--
-- De bucket is privé. client-logos en avatars zijn openbaar, en dat kan daar:
-- een logo mag iedereen zien. Een briefing van een klant niet. Lezen gaat
-- daarom via een ondertekende link die de server per keer aanmaakt, en die na
-- korte tijd verloopt.

alter table files
  alter column project_id drop not null,
  add column if not exists deal_id uuid references deals (id) on delete cascade,
  add column if not exists mime_type text;

-- Een bestand zonder eigenaar is een weesbestand: nergens zichtbaar, wel in de
-- opslag. Minstens één van de twee moet gevuld zijn.
alter table files
  drop constraint if exists files_hoort_ergens_bij;
alter table files
  add constraint files_hoort_ergens_bij
  check (project_id is not null or deal_id is not null);

create index if not exists files_deal_idx on files (deal_id);

-- Alleen het team komt bij dealbestanden. De bestaande leespolicy voor het
-- portaal loopt via het project en laat een rij zonder project_id links liggen,
-- dus die hoeft niet aangepast.
drop policy if exists "files_admin_all" on files;
create policy "files_admin_all" on files
  for all using (is_admin()) with check (is_admin());

-- De privébucket. Bestaat hij al, dan laten we hem zoals hij is.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Geen policies op storage.objects: uploaden gebeurt met een ondertekende link
-- die de server aanmaakt, en downloaden met een ondertekende leeslink. Beide
-- lopen langs de service role, en die gaat sowieso niet door row level security
-- heen. Zo kan de browser niets rechtstreeks in deze bucket.

-- Controleren:
--   select id, public from storage.buckets where id = 'documents';
--   select policyname, cmd from pg_policies where tablename = 'files';
