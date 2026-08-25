-- Deals van bestaande klanten, en een contactpersoon eraan.
--
-- Twee dingen bleken te ontbreken zodra de eerste echte deal binnenkwam:
--
-- 1. Een aanvraag hoeft niet van een onbekende te komen. Een bestaande klant
--    die iets nieuws wil is net zo goed een deal. client_id betekende tot nu
--    toe "hier is hij naartoe omgezet"; dat wordt nu "hij hoort bij deze
--    organisatie", en dat mag dus al vóór het winnen ingevuld zijn.
--
-- 2. Een contactpersoon hoort erbij, als verwijzing naar contacts. Bestaat hij
--    nog niet, dan maak je hem aan vanuit de keuzelijst zelf; dan staat hij
--    meteen in je contactpersonen en niet alleen bij deze deal.
--
-- Omdat client_id niet langer "omgezet" betekent, is er een eigen stempel
-- nodig. Zonder dat zou een deal van een bestaande klant meteen als omgezet
-- gelden en zou de knop verdwijnen voordat je hem gebruikt hebt.
--
-- 3. De losse tekstvelden company, contact_name, email en phone gaan eruit. Ze
--    waren een tweede plek voor gegevens die al in clients en contacts staan,
--    en dan is het wachten op twee versies van dezelfde naam. Wie er nog niet
--    is maak je aan vanuit de keuzelijst zelf.

alter table deals
  add column if not exists contact_id uuid references contacts (id) on delete set null,
  add column if not exists converted_at timestamptz;

-- Wat er al omgezet was herkennen we aan het project dat toen is aangemaakt.
update deals
   set converted_at = coalesce(closed_at, created_at)
 where project_id is not null
   and converted_at is null;

alter table deals
  drop column if exists company,
  drop column if exists contact_name,
  drop column if exists email,
  drop column if exists phone;

create index if not exists deals_client_idx on deals (client_id);

comment on column deals.client_id is
  'De organisatie waar deze aanvraag bij hoort. Vooraf in te vullen bij een bestaande klant, en anders gevuld bij het omzetten.';
comment on column deals.converted_at is
  'Wanneer de deal is omgezet naar een organisatie en project. Null = nog niet omgezet.';
comment on column deals.contact_id is
  'De contactpersoon uit contacts. Nieuwe maak je aan vanuit de keuzelijst.';

-- Controleren:
--   select id, title, client_id, contact_id, converted_at from deals order by created_at desc;
