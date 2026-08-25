-- Een admin mag alle profielen lezen.
--
-- profiles_read kende drie gevallen: je eigen profiel, het team (role =
-- 'admin'), en collega's binnen dezelfde organisatie via my_client_ids(). Een
-- admin zit zelf in geen enkele client_members-rij, dus die derde tak levert
-- hem niets op: klantprofielen bleven onleesbaar.
--
-- Zichtbaar werd dat in het activiteitenlog, waar elke handeling van een klant
-- als "Systeem" verscheen omdat de koppeling naar profiles leeg terugkwam. Het
-- raakt meer plekken in het dashboard waar een naam bij een profiel-id hoort.
--
-- De reden dat deze policy ooit strak is gezet blijft overeind: de oude versie
-- had "role = 'admin'" als losse voorwaarde, waardoor iedereen met de
-- anon-sleutel het team kon uitlezen zonder in te loggen. Daarom blijft de
-- buitenste eis dat je bent ingelogd staan, en is is_admin() veilig: die
-- functie toetst zelf auth.uid() tegen profiles en is voor een bezoeker zonder
-- account dus onwaar.

drop policy if exists "profiles_read" on profiles;
create policy "profiles_read" on profiles
  for select using (
    auth.uid() is not null
    and (
      -- een admin ziet iedereen; hij beheert ze ook
      is_admin()
      -- je eigen profiel
      or id = auth.uid()
      -- het team, nodig voor de lead en de namen bij berichten
      or role = 'admin'
      -- collega's binnen dezelfde organisatie
      or id in (
        select cm.user_id
        from client_members cm
        where cm.client_id in (select my_client_ids())
      )
    )
  );

-- Controleren wat er nu staat:
--   select policyname, qual from pg_policies
--   where schemaname = 'public' and tablename = 'profiles';
