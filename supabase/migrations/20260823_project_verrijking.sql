-- Projectpagina verrijken: fase, volgende stap, wat de klant moet doen,
-- opgeleverde links, en een intern budget.
--
-- Bewust twee soorten velden. phase/next_step/client_action/live_url/staging_url
-- zijn voor de klant bedoeld; budget_amount is intern en blijft in het portaal
-- onzichtbaar, omdat er tegen een vaste prijs wordt gewerkt en een klant dan
-- niets aan een budgetstand heeft.

alter table projects
  add column if not exists phase          text,
  add column if not exists next_step      text,
  add column if not exists client_action  text,
  add column if not exists live_url       text,
  add column if not exists staging_url    text,
  add column if not exists budget_amount  numeric(14,2);

comment on column projects.phase         is 'Waar het project staat: kickoff, ontwerp, development, review, live.';
comment on column projects.next_step     is 'Eén zin over wat er nu gebeurt. Zichtbaar voor de klant.';
comment on column projects.client_action is 'Wat wij van de klant nodig hebben. Zichtbaar voor de klant.';
comment on column projects.budget_amount is 'Afgesproken prijs excl. btw. Alleen intern.';

-- Facturen aan een project kunnen hangen. Ze blijven aan de klant gekoppeld;
-- dit is een extra, optionele verfijning zodat een projectpagina zijn eigen
-- facturen kan tonen.
alter table moneybird_invoices
  add column if not exists project_id uuid references projects(id) on delete set null;

create index if not exists moneybird_invoices_project_idx
  on moneybird_invoices (project_id);

-- De klant mag de projectvelden lezen die voor hem bedoeld zijn. Het budget
-- staat op dezelfde rij, dus afscherming op kolomniveau kan hier niet: de
-- portaalcode vraagt het budget simpelweg nooit op.
