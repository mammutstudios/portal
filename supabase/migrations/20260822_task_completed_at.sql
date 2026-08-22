-- Wanneer is een ticket afgerond? Zonder dit weten we alleen dát het af is,
-- en kun je geen "afgerond in deze maand" berekenen.
alter table tasks add column if not exists completed_at timestamptz;

-- Bestaande afgeronde tickets krijgen bewust géén waarde: wanneer ze zijn
-- afgerond is niet meer te achterhalen en een gok zou de recap vervuilen.
create index if not exists tasks_completed_at_idx on tasks (completed_at);
