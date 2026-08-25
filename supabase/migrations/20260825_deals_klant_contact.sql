-- Deals van bestaande klanten, en een contactpersoon eraan.
--
-- Twee dingen bleken te ontbreken zodra de eerste echte deal binnenkwam:
--
-- 1. Een aanvraag hoeft niet van een onbekende te komen. Een bestaande klant
--    die iets nieuws wil is net zo goed een deal. client_id betekende tot nu
--    toe "hier is hij naartoe omgezet"; dat wordt nu "hij hoort bij deze
--    organisatie", en dat mag dus al vóór het winnen ingevuld zijn.
--
-- 2. Een contactpersoon hoort erbij. Ken je hem al, dan wijs je hem aan; is
--    het iemand nieuws, dan blijven de losse velden staan en wordt hij bij het
--    omzetten als contact aangemaakt en aan de organisatie gekoppeld.
--
-- Omdat client_id niet langer "omgezet" betekent, is er een eigen stempel
-- nodig. Zonder dat zou een deal van een bestaande klant meteen als omgezet
-- gelden en zou de knop verdwijnen voordat je hem gebruikt hebt.

alter table deals
  add column if not exists contact_id uuid references contacts (id) on delete set null,
  add column if not exists converted_at timestamptz;

-- Wat er al omgezet was herkennen we aan het project dat toen is aangemaakt.
update deals
   set converted_at = coalesce(closed_at, created_at)
 where project_id is not null
   and converted_at is null;

create index if not exists deals_client_idx on deals (client_id);

comment on column deals.client_id is
  'De organisatie waar deze aanvraag bij hoort. Vooraf in te vullen bij een bestaande klant, en anders gevuld bij het omzetten.';
comment on column deals.converted_at is
  'Wanneer de deal is omgezet naar een organisatie en project. Null = nog niet omgezet.';
comment on column deals.contact_id is
  'Bestaande contactpersoon. Is dit leeg, dan staan de losse contactvelden erin.';

-- Controleren:
--   select id, title, client_id, contact_id, converted_at from deals order by created_at desc;
