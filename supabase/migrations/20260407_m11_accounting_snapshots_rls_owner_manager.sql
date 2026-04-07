-- Élargit la whitelist RLS de accounting_snapshots aux rôles owner/manager/admin
-- Pascal (gérant) a profiles.role = 'owner', donc la policy initiale 'admin' seul le bloquait.
-- Cohérent avec requireQhsAdmin() utilisé par le layout /comptabilite et le fix M13 (commit 50b487e).

drop policy if exists "accounting_snapshots_admin_read" on public.accounting_snapshots;

create policy "accounting_snapshots_admin_read"
  on public.accounting_snapshots for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('owner', 'manager', 'admin')
  ));
