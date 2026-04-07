# M12 Documents & Conformité — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Livrer la GED Resto360 (coffre-fort docs + versioning + calendrier + registres + rappels stub) avant la démo LCQF 2026-04-09.

**Architecture:** 5 tables Supabase (`document_categories`, `documents`, `document_versions`, `legal_registers`, `document_notifications`) + bucket Storage privé `documents` + 1 vue SQL `documents_with_status` + 5 routes Next.js sous `/documents` + 1 Edge Function stub. Pattern `untyped()` pour toutes les queries (cf. `src/lib/reviews/queries.ts`).

**Tech Stack:** Next.js 16 / React 19 / Supabase (PG + Storage + Edge Functions) / shadcn v4 / Tailwind 4 / TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-04-07-m12-documents-conformite-design.md`

**Conventions critiques** :
- RLS whitelist `profiles.role IN ('owner','manager','admin')` — JAMAIS `'admin'` seul (fix b864dfb)
- Layout gating via `requireQhsAdmin()` (cf. `src/app/(dashboard)/comptabilite/layout.tsx`)
- Pattern `untyped()` exact comme `src/lib/reviews/queries.ts:6-10`
- Types manuels dans `src/types/documents.ts`
- shadcn v4 : `render` prop, jamais `asChild`
- Pas d'icônes Instagram/Facebook (`lucide-react`)
- Avant `npm run build` : `export PATH="/Users/jmr/.nvm/versions/node/v22.18.0/bin:$PATH"`
- Migrations via MCP `apply_migration` ET fichier dans `supabase/migrations/`
- Build + commit + push après chaque task

---

## File Structure

**Création** :
- `supabase/migrations/20260407_m12_documents.sql`
- `src/types/documents.ts`
- `src/lib/documents/queries.ts`
- `src/lib/documents/storage.ts`
- `src/lib/documents/format.ts`
- `src/app/(dashboard)/documents/layout.tsx`
- `src/app/(dashboard)/documents/page.tsx` (remplace stub)
- `src/app/(dashboard)/documents/actions.ts`
- `src/app/(dashboard)/documents/_components/{kpi-cards,alerts-list,document-form-dialog,documents-table,category-sidebar,version-timeline,calendar-grid,register-card}.tsx`
- `src/app/(dashboard)/documents/bibliotheque/page.tsx`
- `src/app/(dashboard)/documents/[id]/page.tsx`
- `src/app/(dashboard)/documents/calendrier/page.tsx`
- `src/app/(dashboard)/documents/registres/page.tsx`
- `supabase/functions/documents-check-expirations/index.ts`

---

## Task 1 — Schéma SQL + RLS + Storage + seeds

**Files:**
- Create: `supabase/migrations/20260407_m12_documents.sql`

- [ ] **Step 1: Écrire la migration**

```sql
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

-- Seeds registres légaux (1 par restaurant — exécutées au runtime côté app si besoin)
-- (insertion live via app à la première visite ; pas de seed multi-tenant ici)

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
```

- [ ] **Step 2: Appliquer via MCP**

Utiliser `mcp__1e6e2ae8-...__apply_migration` avec project_id `vymwkwziytcetjlvtbcc`, name `m12_documents`, query = contenu ci-dessus.

- [ ] **Step 3: Vérifier**

`mcp__...__list_tables` filtré sur schema `public` → vérifier présence des 5 tables + view.

- [ ] **Step 4: Commit + push**

```bash
git add supabase/migrations/20260407_m12_documents.sql
git commit -m "feat(m12): schema documents + RLS + storage bucket"
git push
```

---

## Task 2 — Types manuels + lib helpers

**Files:**
- Create: `src/types/documents.ts`, `src/lib/documents/queries.ts`, `src/lib/documents/storage.ts`, `src/lib/documents/format.ts`

- [ ] **Step 1: Types**

```ts
// src/types/documents.ts
export type UrgencyLevel = 'expired' | 'critical' | 'warning' | 'info' | 'ok';
export type RegisterStatus = 'a-jour' | 'a-verifier' | 'manquant';
export type SourceModule = 'M05' | 'M07' | 'M11' | 'M12' | 'M13';
export type NotificationType = '30d' | '60d' | '90d' | 'expired';

export interface DocumentCategory {
  id: string; slug: string; label: string; icon: string | null; sort_order: number;
}

export interface DocumentRow {
  id: string; restaurant_id: string; category_id: string | null;
  title: string; description: string | null;
  current_version_id: string | null;
  issued_at: string | null; expires_at: string | null;
  reference_number: string | null; issuer: string | null;
  tags: string[]; created_by: string | null;
  created_at: string; updated_at: string;
}

export interface DocumentWithStatus extends DocumentRow {
  days_until_expiry: number | null;
  urgency_level: UrgencyLevel;
}

export interface DocumentVersion {
  id: string; document_id: string; version_number: number;
  storage_path: string; file_name: string; file_size: number | null;
  mime_type: string | null; uploaded_by: string | null;
  uploaded_at: string; change_notes: string | null;
}

export interface LegalRegister {
  id: string; restaurant_id: string; slug: string; label: string;
  description: string | null; source_module: SourceModule | null;
  source_url: string | null; last_updated_at: string | null;
  status: RegisterStatus;
}

export interface DocumentNotification {
  id: string; document_id: string; notification_type: NotificationType;
  scheduled_for: string | null; sent_at: string | null;
  recipient_role: string | null; channel: string;
  payload: Record<string, unknown> | null;
}
```

- [ ] **Step 2: queries.ts**

Calquer sur `src/lib/reviews/queries.ts` (pattern `untyped()` identique). Fonctions à implémenter :
- `getCategories()` → `DocumentCategory[]`
- `getDocumentsWithStatus(restaurantId)` → `DocumentWithStatus[]` (from `documents_with_status`)
- `getDocumentById(id)` → `DocumentWithStatus | null`
- `getVersions(documentId)` → `DocumentVersion[]` (order by version_number desc)
- `getRegisters(restaurantId)` → `LegalRegister[]`
- `getNotifications(documentId)` → `DocumentNotification[]`
- `getKpis(restaurantId)` → `{ total, critical, warning, info }` (compte par urgency_level)
- `getExpiringSoon(restaurantId, days = 90)` → `DocumentWithStatus[]` triés par expires_at

- [ ] **Step 3: storage.ts**

```ts
import { createClient } from "@/lib/supabase/server";
export async function uploadDocumentFile(
  restaurantId: string, documentId: string, versionNumber: number, file: File
): Promise<{ path: string; size: number; mime: string; name: string }> {
  const supabase = await createClient();
  const path = `${restaurantId}/${documentId}/${versionNumber}-${file.name}`;
  const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false });
  if (error) throw error;
  return { path, size: file.size, mime: file.type, name: file.name };
}
export async function getSignedUrl(path: string, expiresIn = 300): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
export async function deleteDocumentFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = await createClient();
  await supabase.storage.from('documents').remove(paths);
}
```

- [ ] **Step 4: format.ts**

Helpers : `formatExpiry(date)`, `urgencyColor(level)`, `urgencyLabel(level)`, `formatFileSize(bytes)`.

- [ ] **Step 5: Build + commit**

```bash
export PATH="/Users/jmr/.nvm/versions/node/v22.18.0/bin:$PATH"
npm run build
git add src/types/documents.ts src/lib/documents/
git commit -m "feat(m12): types + lib helpers"
git push
```

---

## Task 3 — Layout gating + Hub `/documents`

**Files:**
- Create: `src/app/(dashboard)/documents/layout.tsx`
- Modify: `src/app/(dashboard)/documents/page.tsx` (remplace stub)
- Create: `src/app/(dashboard)/documents/_components/kpi-cards.tsx`, `alerts-list.tsx`

- [ ] **Step 1: Layout**

```tsx
import { requireQhsAdmin } from "@/lib/qhs/auth";
export default async function DocumentsLayout({ children }: { children: React.ReactNode }) {
  await requireQhsAdmin();
  return <>{children}</>;
}
```

- [ ] **Step 2: page.tsx hub**

Récupère via queries : `getKpis`, `getExpiringSoon`. Affiche 4 cards (total, critical, warning, info) + AlertsList + 3 quick action buttons (Bibliothèque, Calendrier, Registres) + bouton « Lancer la vérification d'échéances » (server action `triggerExpirationCheck` — stub OK pour ce chunk, retourne `{ ok: true }`).

- [ ] **Step 3: kpi-cards.tsx + alerts-list.tsx**

Components shadcn (`Card`, `Badge`). KPI grid responsive 2/4 cols. AlertsList = tableau avec urgency badge coloré, lien `/documents/[id]`.

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add src/app/\(dashboard\)/documents/
git commit -m "feat(m12): hub documents + KPIs + alertes"
git push
```

---

## Task 4 — Bibliothèque + dialog création + upload

**Files:**
- Create: `src/app/(dashboard)/documents/bibliotheque/page.tsx`
- Create: `src/app/(dashboard)/documents/actions.ts`
- Create: `_components/category-sidebar.tsx`, `documents-table.tsx`, `document-form-dialog.tsx`

- [ ] **Step 1: actions.ts — `createDocument`**

Server action. Reçoit FormData (category_id, title, description, expires_at, reference_number, issuer, file). Flow :
1. INSERT `documents` (sans current_version_id)
2. `uploadDocumentFile(restaurantId, docId, 1, file)`
3. INSERT `document_versions` (version_number=1, storage_path...)
4. UPDATE `documents.current_version_id = versionId`
5. `revalidatePath('/documents')` + `/documents/bibliotheque`

Wrapper try/catch, retourne `{ ok, error? }`.

- [ ] **Step 2: bibliotheque/page.tsx**

Sidebar catégories (compteur via `getDocumentsWithStatus`) + DocumentsTable filtrable + bouton "Nouveau document" → DocumentFormDialog.

- [ ] **Step 3: DocumentFormDialog**

shadcn `Dialog`, form avec `Input`, `Textarea`, `Select` (catégorie), `Input type="date"`, `Input type="file"`. Submit → `createDocument`. Toast succès/erreur.

- [ ] **Step 4: Test upload réel**

Lancer l'app en local OU déployer preview : créer 1 doc test, vérifier dans Supabase Storage que le fichier apparaît à `{restaurant_id}/{doc_id}/1-...`. Si échec policies → revoir Task 1.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/app/\(dashboard\)/documents/
git commit -m "feat(m12): bibliothèque + upload Storage"
git push
```

---

## Task 5 — Fiche document + versioning

**Files:**
- Create: `src/app/(dashboard)/documents/[id]/page.tsx`
- Create: `_components/version-timeline.tsx`, `add-version-dialog.tsx`
- Modify: `actions.ts` — ajouter `addVersion`, `updateDocument`, `deleteDocument`

- [ ] **Step 1: actions — `addVersion(documentId, FormData)`**

1. SELECT max(version_number) where document_id → next = max + 1
2. `uploadDocumentFile(...)` avec next
3. INSERT `document_versions`
4. UPDATE `documents.current_version_id`, `updated_at`
5. revalidatePath

- [ ] **Step 2: actions — `updateDocument(id, patch)` + `deleteDocument(id)`**

Delete : SELECT all versions → `deleteDocumentFiles(paths)` → DELETE document (cascade versions/notifications).

- [ ] **Step 3: page.tsx fiche**

Header (titre, badges urgence + version courante). Tabs shadcn : `Métadonnées` / `Versions` / `Notifications`. Métadonnées éditables inline ou dialog. Versions = VersionTimeline + bouton "Nouvelle version". Notifications = liste read-only avec `notification_type`, `sent_at`, payload.

- [ ] **Step 4: VersionTimeline**

Liste cards triées DESC. Chaque card : `v{N}`, uploaded_by, uploaded_at, change_notes, bouton "Télécharger" (génère signed URL via server action `getDownloadUrl(versionId)`).

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/app/\(dashboard\)/documents/
git commit -m "feat(m12): fiche document + versioning"
git push
```

---

## Task 6 — Calendrier des renouvellements

**Files:**
- Create: `src/app/(dashboard)/documents/calendrier/page.tsx`
- Create: `_components/calendar-grid.tsx`

- [ ] **Step 1: calendar-grid.tsx**

Grille HTML/CSS pure (pas de lib). Reçoit `documents: DocumentWithStatus[]` + `month: Date`. Affiche 7 colonnes × 5-6 rangées. Chaque cellule : numéro du jour + petit badge coloré par urgency si doc expire ce jour. Click cellule → callback avec docs concernés.

- [ ] **Step 2: page.tsx**

Récupère docs avec `expires_at` non null. State client `currentMonth`. Boutons ← →. Filtre catégorie (Select). Sous le calendrier : liste des docs du jour sélectionné.

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/app/\(dashboard\)/documents/calendrier/ src/app/\(dashboard\)/documents/_components/calendar-grid.tsx
git commit -m "feat(m12): calendrier renouvellements"
git push
```

---

## Task 7 — Registres légaux

**Files:**
- Create: `src/app/(dashboard)/documents/registres/page.tsx`
- Create: `_components/register-card.tsx`
- Modify: `actions.ts` — `seedRegistersIfMissing(restaurantId)`

- [ ] **Step 1: seedRegistersIfMissing**

Si `getRegisters(restaurantId)` est vide, INSERT 5 lignes :
- registre-personnel → M07, `/personnel`
- registre-haccp → M13, `/qhs`
- duerp → M12, `/documents/bibliotheque?cat=legal`
- registre-entrees-sorties → M05, `/stock`
- bilans-comptables → M11, `/comptabilite`

- [ ] **Step 2: page.tsx**

Server component. Appelle `seedRegistersIfMissing` puis `getRegisters`. Grid 2/3 cols de RegisterCard.

- [ ] **Step 3: RegisterCard**

shadcn Card. Affiche label, description, badge module source coloré, status badge, last_updated, bouton lien (`render` prop, pas `asChild`).

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add src/app/\(dashboard\)/documents/registres/ src/app/\(dashboard\)/documents/_components/register-card.tsx src/app/\(dashboard\)/documents/actions.ts
git commit -m "feat(m12): registres légaux + seed"
git push
```

---

## Task 8 — Edge Function check-expirations + bouton manuel

**Files:**
- Create: `supabase/functions/documents-check-expirations/index.ts`
- Modify: `src/app/(dashboard)/documents/actions.ts` — implémenter vrai `triggerExpirationCheck`

- [ ] **Step 1: Edge function**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const { data: docs, error } = await supabase
    .from('documents_with_status')
    .select('*')
    .not('expires_at','is',null)
    .lte('days_until_expiry', 90);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let created = 0;
  for (const d of docs ?? []) {
    let bucket: '30d'|'60d'|'90d'|'expired';
    const days = d.days_until_expiry as number;
    if (days < 0) bucket = 'expired';
    else if (days <= 30) bucket = '30d';
    else if (days <= 60) bucket = '60d';
    else bucket = '90d';

    const { data: existing } = await supabase
      .from('document_notifications')
      .select('id')
      .eq('document_id', d.id)
      .eq('notification_type', bucket)
      .maybeSingle();
    if (existing) continue;

    await supabase.from('document_notifications').insert({
      document_id: d.id,
      notification_type: bucket,
      scheduled_for: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      recipient_role: 'owner,manager,admin',
      channel: 'email-stub',
      payload: {
        subject: `[Resto360] Document à renouveler : ${d.title}`,
        body: `Le document "${d.title}" expire ${days < 0 ? 'depuis' : 'dans'} ${Math.abs(days)} jours.`
      }
    });
    created++;
  }
  return new Response(JSON.stringify({ checked: docs?.length ?? 0, created }), {
    headers: { 'Content-Type':'application/json' }
  });
});
```

- [ ] **Step 2: Deploy via MCP**

`mcp__1e6e2ae8-...__deploy_edge_function` avec project_id `vymwkwziytcetjlvtbcc`, name `documents-check-expirations`, files = contenu ci-dessus.

- [ ] **Step 3: triggerExpirationCheck server action**

```ts
"use server";
import { createClient } from "@/lib/supabase/server";
export async function triggerExpirationCheck() {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke('documents-check-expirations');
  if (error) return { ok: false, error: error.message };
  return { ok: true, ...data };
}
```

- [ ] **Step 4: Test live**

Créer un doc avec `expires_at = today + 15 days`, cliquer le bouton hub → vérifier qu'une row apparaît dans `document_notifications` avec `notification_type='30d'`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/documents-check-expirations/ src/app/\(dashboard\)/documents/actions.ts
git commit -m "feat(m12): edge function rappels échéances (stub)"
git push
```

---

## Task 9 — Release démo LCQF

- [ ] **Step 1: Lint + build complet**

```bash
export PATH="/Users/jmr/.nvm/versions/node/v22.18.0/bin:$PATH"
npm run lint
npm run build
```

Aucune erreur tolérée.

- [ ] **Step 2: Smoke test prod**

Sur la preview Vercel : login owner, parcourir les 5 routes `/documents`, créer 1 doc avec fichier réel + échéance, ajouter 1 nouvelle version, vérifier calendrier, vérifier registres, lancer check expirations.

- [ ] **Step 3: Tag release + push**

```bash
git tag -a m12-demo-lcqf -m "M12 Documents & Conformité — démo LCQF 2026-04-09"
git push origin m12-demo-lcqf
```

- [ ] **Step 4: Vérifier déploiement Vercel**

`mcp__0c3f3285-...__list_deployments` → confirmer build prod READY sur main.

---

## Self-review

✅ Spec coverage : 5 tables ✓, vue ✓, bucket ✓, RLS owner/manager/admin ✓, 5 routes ✓, versioning ✓, calendrier ✓, registres ✓, edge function stub ✓, gating layout ✓
✅ No placeholders : tous les snippets sont concrets
✅ Type consistency : `DocumentWithStatus`, `urgency_level`, `current_version_id` cohérents entre Task 2 et tasks suivantes
✅ Conventions critiques rappelées en tête
