-- M12 Documents & Conformité

create table if not exists document_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  icon text,
  sort_order int default 0
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  category_id uuid references document_categories(id) on delete restrict,
  title text not null,
  description text,
  current_version_id uuid,
  issued_at date,
  expires_at date,
  reference_number text,
  issuer text,
  tags text[] default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  version_number int not null,
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz default now(),
  change_notes text,
  unique(document_id, version_number)
);

alter table documents
  add constraint documents_current_version_fk
  foreign key (current_version_id) references document_versions(id) on delete set null;

create table if not exists legal_registers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  slug text not null,
  label text not null,
  description text,
  source_module text check (source_module in ('M05','M07','M11','M12','M13')),
  source_url text,
  last_updated_at timestamptz,
  status text check (status in ('a-jour','a-verifier','manquant')) default 'a-verifier'
);

create table if not exists document_notifications (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  notification_type text check (notification_type in ('30d','60d','90d','expired')) not null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_role text,
  channel text default 'email-stub',
  payload jsonb,
  unique(document_id, notification_type)
);

create index documents_restaurant_idx on documents(restaurant_id);
create index documents_category_idx on documents(category_id);
create index documents_expires_idx on documents(expires_at);
create index document_versions_doc_idx on document_versions(document_id);

-- Vue avec urgence
create or replace view documents_with_status as
select
  d.*,
  case
    when d.expires_at is null then null
    else (d.expires_at - current_date)::int
  end as days_until_expiry,
  case
    when d.expires_at is null then 'ok'
    when d.expires_at < current_date then 'expired'
    when d.expires_at - current_date <= 30 then 'critical'
    when d.expires_at - current_date <= 60 then 'warning'
    when d.expires_at - current_date <= 90 then 'info'
    else 'ok'
  end as urgency_level
from documents d;

-- RLS : whitelist owner/manager/admin
alter table document_categories enable row level security;
alter table documents enable row level security;
alter table document_versions enable row level security;
alter table legal_registers enable row level security;
alter table document_notifications enable row level security;

create policy "doc_categories_read_all" on document_categories
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid()
            and p.role in ('owner','manager','admin'))
  );

create policy "documents_all_admins" on documents
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
            and p.role in ('owner','manager','admin'))
  );

create policy "document_versions_all_admins" on document_versions
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
            and p.role in ('owner','manager','admin'))
  );

create policy "legal_registers_all_admins" on legal_registers
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
            and p.role in ('owner','manager','admin'))
  );

create policy "document_notifications_all_admins" on document_notifications
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid()
            and p.role in ('owner','manager','admin'))
  );

-- Seeds catégories
insert into document_categories (slug, label, icon, sort_order) values
  ('licences','Licences','BadgeCheck',1),
  ('assurances','Assurances','Shield',2),
  ('contrats-fournisseurs','Contrats fournisseurs','FileSignature',3),
  ('procedures','Procédures','BookOpen',4),
  ('certifications','Certifications','Award',5),
  ('legal','Légal','Scale',6),
  ('archives-dgccrf','Archives DGCCRF/DDPP','Archive',7)
on conflict (slug) do nothing;

-- Storage bucket privé
insert into storage.buckets (id, name, public)
values ('documents','documents',false)
on conflict (id) do nothing;

create policy "documents_storage_admins" on storage.objects
  for all using (
    bucket_id = 'documents'
    and exists (select 1 from profiles p where p.id = auth.uid()
                and p.role in ('owner','manager','admin'))
  );
