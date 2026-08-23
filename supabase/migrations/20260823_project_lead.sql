-- Wie is de lead op dit project? Zichtbaar voor de klant, zodat hij weet bij
-- wie hij moet zijn.

alter table projects
  add column if not exists lead_profile_id uuid references profiles(id) on delete set null;

comment on column projects.lead_profile_id is
  'Teamlid dat dit project trekt. Zichtbaar in het klantportaal.';

create index if not exists projects_lead_idx on projects (lead_profile_id);

-- Zonder dit blijft de naam van de lead leeg in het portaal, en staan de
-- berichten op naam van "Onbekend": profiles heeft row level security en een
-- klant kan er nu niets uit lezen.
--
-- We openen alleen wat nodig is: je eigen profiel, dat van het team, en dat
-- van collega's binnen dezelfde organisatie. Andere klanten blijven onzichtbaar.
drop policy if exists "profiles_read" on profiles;
create policy "profiles_read" on profiles
  for select using (
    id = auth.uid()
    or role = 'admin'
    or id in (
      select cm.profile_id
      from client_members cm
      where cm.client_id in (select my_client_ids())
    )
  );
