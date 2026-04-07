create table public.accounting_snapshots (
  id uuid primary key default gen_random_uuid(),
  period date not null unique,
  ca_ht numeric(12,2) not null,
  ca_ttc numeric(12,2) not null,
  couverts integer not null,
  ticket_moyen numeric(8,2) not null,
  food_cost numeric(5,2) not null,
  charges_variables numeric(12,2) not null,
  marge_brute numeric(12,2) not null,
  masse_salariale numeric(12,2) not null,
  charges_fixes numeric(12,2) not null,
  ebitda numeric(12,2) not null,
  resultat_net numeric(12,2) not null,
  budget_ca numeric(12,2),
  budget_charges numeric(12,2),
  created_at timestamptz not null default now()
);

alter table public.accounting_snapshots enable row level security;

create policy "accounting_snapshots_admin_read"
  on public.accounting_snapshots for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create index accounting_snapshots_period_idx on public.accounting_snapshots(period desc);
