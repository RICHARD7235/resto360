# M08 Qualité H&S — Chunk B : Backend / Data Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## ⚠️ ADDENDUM 2026-04-07 — corrections obligatoires (lire avant d'exécuter)

Corrections issues d'une exploration du code réel — elles **remplacent** les choix initiaux du plan :

1. **Helper Supabase.** `createUntypedClient` **n'existe pas**. Le projet utilise `createClient()` ASYNC depuis `@/lib/supabase/server`. Dans `queries.ts` et `mutations.ts`, remplacer toutes les occurrences :
   ```ts
   // ❌ const supabase = createUntypedClient();
   // ✅
   import { createClient } from "@/lib/supabase/server";
   const supabase = await createClient();
   ```
   Toutes les fonctions deviennent `async` (elles le sont déjà).
2. **Table personnel → `staff_members`.** Toute requête `from("personnel")` devient `from("staff_members")`. La colonne `pin_hash` est ajoutée par la migration du chunk A (DÉCISION A1).
3. **Hash PIN.** Utiliser SHA-256 (`createHash("sha256").update(pin).digest("hex")`) — cohérent avec le seed `encode(sha256('0000'::bytea), 'hex')` du chunk A. Pas de bcrypt.
4. **Rôles admin (DÉCISION B1).** Dans `closeNonConformity` et toute autre vérif de rôle, whitelister **`manager` uniquement** :
   ```ts
   p.pin_hash === pinHash && p.role === "manager"
   ```
   Plus aucune référence à `"admin"` / `"responsable_site"`.
5. **Routes server actions.** Le module vit sous `/qualite/...` et NON `/quotidien/qualite/...`. Dans `actions.ts` :
   - Path du fichier : `src/app/(dashboard)/qualite/actions.ts` (et non `quotidien/qualite/`)
   - `revalidatePath("/qualite/nettoyage")` (et NON `/quotidien/qualite/nettoyage`)
   - Idem pour `/qualite/nettoyage/admin`
6. **getUserRestaurantId.** Pas de helper centralisé. Copier le pattern depuis `src/app/(dashboard)/commandes/actions.ts` (lookup `profiles.id = auth.uid → profiles.restaurant_id`) en haut de `actions.ts`.
7. **Vitest (DÉCISION C1).** Vitest n'est pas installé. Task 0 Step 2 doit donc EXÉCUTER l'install :
   ```bash
   cd resto-360 && npm install -D vitest @vitejs/plugin-react happy-dom
   ```
   Et créer `vitest.config.ts` minimal avant Task 2.

Toutes les autres parties du plan restent valides.

---

**Goal:** Construire la couche d'accès aux données et la logique métier du module M08 (types manuels, fetchers, mutations, calcul des créneaux, export PDF, server actions).

**Architecture:** Pattern existant Resto360 — types TypeScript manuels (règle projet "no Supabase joins"), `queries.ts` pour les fetchers, `mutations.ts` pour les writes, server actions Next.js orchestrant le tout, lib pure pour la logique calculable et tests unitaires Vitest.

**Tech Stack:** TypeScript, Next.js 15 server actions, Supabase JS client (createUntypedClient pattern M07), Vitest, `@react-pdf/renderer`, date-fns.

**Pré-requis :** Chunk A appliqué (DB en place), `@react-pdf/renderer` installé, Vitest configuré dans le projet (vérifier `package.json`). Si Vitest absent : remplacer par le runner du projet ou ajouter en deps dev.

**Référence spec :** `docs/superpowers/specs/2026-04-07-m08-qualite-hygiene-securite-design.md` — sections 5 (modèle), 6.1 (créneaux), 6.4 (validation PIN), 6.5 (export PDF).

---

## Task 0 : Installer les dépendances

**Files:**
- Modify: `resto-360/package.json`

- [ ] **Step 1: Installer `@react-pdf/renderer`**

```bash
cd resto-360 && npm install @react-pdf/renderer
```

Expected: ajout à `dependencies`.

- [ ] **Step 2: Vérifier Vitest présent**

```bash
cat resto-360/package.json | grep -E '"vitest|"jest'
```

Si rien : `npm install -D vitest @vitejs/plugin-react happy-dom` et créer `vitest.config.ts` minimal.

- [ ] **Step 3: Commit**

```bash
git add resto-360/package.json resto-360/package-lock.json
git commit -m "chore(m08): add @react-pdf/renderer dependency"
```

---

## Task 1 : Types manuels `qhs/types.ts`

**Files:**
- Create: `resto-360/src/lib/supabase/qhs/types.ts`

- [ ] **Step 1: Écrire les types**

```typescript
// src/lib/supabase/qhs/types.ts
// Types manuels — règle projet : pas de joins Supabase, types non générés.
// Source de vérité : migration 20260407120000_qhs_module.sql

export type QhsFrequency =
  | "quotidien" | "hebdo" | "mensuel" | "trimestriel" | "annuel";

export type QhsServiceCreneau =
  | "avant_midi" | "apres_midi" | "avant_soir" | "apres_soir"
  | "fin_journee" | "libre";

export type QhsInstanceStatut =
  | "a_faire" | "en_cours" | "validee" | "en_retard" | "non_conforme";

export type QhsNcStatut = "ouverte" | "en_cours" | "cloturee";

export interface QhsZone {
  id: string;
  restaurant_id: string;
  nom: string;
  code: string;
  critique: boolean;
  actif: boolean;
  created_at: string;
}

export interface QhsTaskTemplate {
  id: string;
  restaurant_id: string | null;
  zone_id: string | null;
  libelle: string;
  description: string | null;
  produit_utilise: string | null;
  frequency: QhsFrequency;
  service_creneau: QhsServiceCreneau | null;
  jour_semaine: number | null;
  jour_mois: number | null;
  mois_annee: number | null;
  assigned_role: string | null;
  assigned_user_id: string | null;
  photo_required: boolean;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface QhsTaskInstance {
  id: string;
  template_id: string;
  restaurant_id: string;
  date_prevue: string;       // ISO date YYYY-MM-DD
  creneau_debut: string;     // ISO timestamp
  creneau_fin: string;       // ISO timestamp
  statut: QhsInstanceStatut;
  validation_id: string | null;
  created_at: string;
}

export interface QhsTaskValidation {
  id: string;
  instance_id: string;
  user_id: string;
  validated_at: string;
  pin_used_hash: string;
  photo_url: string | null;
  commentaire: string | null;
}

export interface QhsNonConformity {
  id: string;
  restaurant_id: string;
  instance_id: string | null;
  template_id: string | null;
  zone_id: string | null;
  date_constat: string;
  gravite: 1 | 2 | 3;
  description: string;
  action_corrective: string | null;
  traite_par: string | null;
  traite_at: string | null;
  statut: QhsNcStatut;
}

export interface QhsSettings {
  restaurant_id: string;
  service_midi_debut: string;   // HH:MM:SS
  service_midi_fin: string;
  service_soir_debut: string;
  service_soir_fin: string;
  delai_alerte_manager_min: number;
  delai_creation_nc_min: number;
  email_rapport_quotidien: string | null;
  updated_at: string;
}

// Vue assemblée côté client (zone, template, instance ensemble)
export interface QhsTaskInstanceWithContext extends QhsTaskInstance {
  template: QhsTaskTemplate;
  zone: QhsZone | null;
}
```

- [ ] **Step 2: Vérifier la compilation**

```bash
cd resto-360 && npx tsc --noEmit
```

Expected: pas d'erreur sur ce fichier.

- [ ] **Step 3: Commit**

```bash
git add resto-360/src/lib/supabase/qhs/types.ts
git commit -m "feat(m08): manual typescript types for qhs tables"
```

---

## Task 2 : Logique des créneaux `lib/qhs/creneaux.ts` (TDD)

**Files:**
- Create: `resto-360/src/lib/qhs/creneaux.ts`
- Test:   `resto-360/src/lib/qhs/__tests__/creneaux.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```typescript
// src/lib/qhs/__tests__/creneaux.test.ts
import { describe, it, expect } from "vitest";
import { getCreneauActif, isInCreneau } from "../creneaux";
import type { QhsSettings } from "@/lib/supabase/qhs/types";

const settings: QhsSettings = {
  restaurant_id: "r1",
  service_midi_debut: "11:30:00",
  service_midi_fin: "14:30:00",
  service_soir_debut: "18:30:00",
  service_soir_fin: "22:30:00",
  delai_alerte_manager_min: 15,
  delai_creation_nc_min: 60,
  email_rapport_quotidien: null,
  updated_at: "2026-04-07T00:00:00Z",
};

describe("getCreneauActif", () => {
  it("retourne avant_midi à 11h00", () => {
    expect(getCreneauActif(new Date("2026-04-07T11:00:00"), settings)).toBe("avant_midi");
  });
  it("retourne apres_midi à 14h45", () => {
    expect(getCreneauActif(new Date("2026-04-07T14:45:00"), settings)).toBe("apres_midi");
  });
  it("retourne avant_soir à 18h00", () => {
    expect(getCreneauActif(new Date("2026-04-07T18:00:00"), settings)).toBe("avant_soir");
  });
  it("retourne apres_soir à 22h45", () => {
    expect(getCreneauActif(new Date("2026-04-07T22:45:00"), settings)).toBe("apres_soir");
  });
  it("retourne fin_journee à 23h30", () => {
    expect(getCreneauActif(new Date("2026-04-07T23:30:00"), settings)).toBe("fin_journee");
  });
  it("retourne null à 03h00 (hors service)", () => {
    expect(getCreneauActif(new Date("2026-04-07T03:00:00"), settings)).toBeNull();
  });
});

describe("isInCreneau", () => {
  it("true si maintenant entre debut et fin", () => {
    const now = new Date("2026-04-07T12:00:00");
    expect(isInCreneau(now, "2026-04-07T11:00:00", "2026-04-07T13:00:00")).toBe(true);
  });
  it("false si maintenant après fin", () => {
    const now = new Date("2026-04-07T14:00:00");
    expect(isInCreneau(now, "2026-04-07T11:00:00", "2026-04-07T13:00:00")).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests — doivent échouer**

```bash
cd resto-360 && npx vitest run src/lib/qhs/__tests__/creneaux.test.ts
```

Expected: FAIL (`creneaux` n'existe pas).

- [ ] **Step 3: Implémenter `creneaux.ts`**

```typescript
// src/lib/qhs/creneaux.ts
import type { QhsServiceCreneau, QhsSettings } from "@/lib/supabase/qhs/types";

const parseTime = (hms: string, base: Date): Date => {
  const [h, m] = hms.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
};

export function getCreneauActif(now: Date, s: QhsSettings): QhsServiceCreneau | null {
  const midiDebut = parseTime(s.service_midi_debut, now);
  const midiFin   = parseTime(s.service_midi_fin, now);
  const soirDebut = parseTime(s.service_soir_debut, now);
  const soirFin   = parseTime(s.service_soir_fin, now);

  // avant_midi : 1h avant service midi → début service midi
  const avantMidiDebut = new Date(midiDebut.getTime() - 60 * 60_000);
  if (now >= avantMidiDebut && now < midiDebut) return "avant_midi";

  // service midi en cours
  if (now >= midiDebut && now < midiFin) return "avant_midi";

  // apres_midi : fin service midi → +1h
  const apresMidiFin = new Date(midiFin.getTime() + 60 * 60_000);
  if (now >= midiFin && now < apresMidiFin) return "apres_midi";

  // avant_soir : 1h avant service soir
  const avantSoirDebut = new Date(soirDebut.getTime() - 60 * 60_000);
  if (now >= avantSoirDebut && now < soirDebut) return "avant_soir";

  // service soir en cours
  if (now >= soirDebut && now < soirFin) return "avant_soir";

  // apres_soir : fin service soir → +1h
  const apresSoirFin = new Date(soirFin.getTime() + 60 * 60_000);
  if (now >= soirFin && now < apresSoirFin) return "apres_soir";

  // fin_journee : 23h00 → minuit
  const finJourneeDebut = new Date(now);
  finJourneeDebut.setHours(23, 0, 0, 0);
  if (now >= finJourneeDebut) return "fin_journee";

  return null;
}

export function isInCreneau(now: Date, debut: string, fin: string): boolean {
  const d = new Date(debut).getTime();
  const f = new Date(fin).getTime();
  const n = now.getTime();
  return n >= d && n < f;
}
```

- [ ] **Step 4: Relancer les tests — doivent passer**

```bash
cd resto-360 && npx vitest run src/lib/qhs/__tests__/creneaux.test.ts
```

Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add resto-360/src/lib/qhs/creneaux.ts resto-360/src/lib/qhs/__tests__/creneaux.test.ts
git commit -m "feat(m08): creneau computation logic with unit tests"
```

---

## Task 3 : Queries `qhs/queries.ts`

**Files:**
- Create: `resto-360/src/lib/supabase/qhs/queries.ts`

- [ ] **Step 1: Écrire les fetchers**

```typescript
// src/lib/supabase/qhs/queries.ts
// Pattern projet : requêtes séparées (no joins), assemblage côté JS.

import { createUntypedClient } from "@/lib/supabase/server";
import type {
  QhsZone, QhsTaskTemplate, QhsTaskInstance, QhsTaskInstanceWithContext,
  QhsNonConformity, QhsSettings,
} from "./types";

export async function fetchZones(restaurantId: string): Promise<QhsZone[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from("qhs_zones")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("actif", true)
    .order("nom");
  if (error) throw error;
  return (data ?? []) as QhsZone[];
}

export async function fetchTemplates(restaurantId: string | null): Promise<QhsTaskTemplate[]> {
  const supabase = createUntypedClient();
  const query = supabase.from("qhs_task_templates").select("*").eq("actif", true);
  const { data, error } = restaurantId
    ? await query.eq("restaurant_id", restaurantId)
    : await query.is("restaurant_id", null);
  if (error) throw error;
  return (data ?? []) as QhsTaskTemplate[];
}

export async function fetchInstancesForDay(
  restaurantId: string,
  date: string,
): Promise<QhsTaskInstanceWithContext[]> {
  const supabase = createUntypedClient();

  const { data: instances, error } = await supabase
    .from("qhs_task_instances")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("date_prevue", date);
  if (error) throw error;

  const list = (instances ?? []) as QhsTaskInstance[];
  if (list.length === 0) return [];

  const templateIds = [...new Set(list.map((i) => i.template_id))];
  const { data: templates } = await supabase
    .from("qhs_task_templates")
    .select("*")
    .in("id", templateIds);

  const tplMap = new Map((templates ?? []).map((t: QhsTaskTemplate) => [t.id, t]));

  const zoneIds = [...new Set((templates ?? []).map((t: QhsTaskTemplate) => t.zone_id).filter(Boolean) as string[])];
  const { data: zones } = zoneIds.length
    ? await supabase.from("qhs_zones").select("*").in("id", zoneIds)
    : { data: [] };

  const zoneMap = new Map((zones ?? []).map((z: QhsZone) => [z.id, z]));

  return list.map((inst) => {
    const template = tplMap.get(inst.template_id) as QhsTaskTemplate;
    const zone = template?.zone_id ? (zoneMap.get(template.zone_id) as QhsZone) : null;
    return { ...inst, template, zone };
  });
}

export async function fetchNonConformities(
  restaurantId: string,
  statut?: "ouverte" | "en_cours" | "cloturee",
): Promise<QhsNonConformity[]> {
  const supabase = createUntypedClient();
  let q = supabase
    .from("qhs_nonconformities")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("date_constat", { ascending: false });
  if (statut) q = q.eq("statut", statut);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QhsNonConformity[];
}

export async function fetchSettings(restaurantId: string): Promise<QhsSettings | null> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from("qhs_settings")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  return data as QhsSettings | null;
}

export async function fetchConformiteJour(
  restaurantId: string,
  date: string,
): Promise<{ total: number; validees: number; tauxPct: number }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from("qhs_task_instances")
    .select("statut")
    .eq("restaurant_id", restaurantId)
    .eq("date_prevue", date);
  if (error) throw error;
  const list = (data ?? []) as { statut: string }[];
  const total = list.length;
  const validees = list.filter((i) => i.statut === "validee").length;
  return {
    total,
    validees,
    tauxPct: total === 0 ? 100 : Math.round((validees / total) * 100),
  };
}
```

⚠️ Adapter l'import `createUntypedClient` au pattern exact du projet (cf. M07 — vérifier `src/lib/supabase/server.ts` ou similaire).

- [ ] **Step 2: Vérifier la compilation**

```bash
cd resto-360 && npx tsc --noEmit
```

Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add resto-360/src/lib/supabase/qhs/queries.ts
git commit -m "feat(m08): qhs data fetchers (no joins pattern)"
```

---

## Task 4 : Mutations `qhs/mutations.ts`

**Files:**
- Create: `resto-360/src/lib/supabase/qhs/mutations.ts`

- [ ] **Step 1: Écrire les mutations**

```typescript
// src/lib/supabase/qhs/mutations.ts
import { createUntypedClient } from "@/lib/supabase/server";
import { createHash } from "node:crypto";
import type { QhsTaskTemplate, QhsNonConformity } from "./types";

const hashPin = (pin: string) =>
  createHash("sha256").update(pin).digest("hex");

export interface ValidateTaskInput {
  instanceId: string;
  pin: string;
  photoFile?: File | null;
  commentaire?: string;
}

export async function validateTask(input: ValidateTaskInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createUntypedClient();

  // 1. Charger l'instance
  const { data: inst, error: e1 } = await supabase
    .from("qhs_task_instances")
    .select("id, template_id, restaurant_id, statut")
    .eq("id", input.instanceId)
    .maybeSingle();
  if (e1 || !inst) return { ok: false, error: "Instance introuvable" };
  if (inst.statut === "validee") return { ok: false, error: "Tâche déjà validée" };

  // 2. Charger le template (photo_required)
  const { data: tpl } = await supabase
    .from("qhs_task_templates")
    .select("photo_required")
    .eq("id", inst.template_id)
    .maybeSingle();
  const tplTyped = tpl as Pick<QhsTaskTemplate, "photo_required"> | null;

  if (tplTyped?.photo_required && !input.photoFile) {
    return { ok: false, error: "Photo obligatoire pour cette tâche" };
  }

  // 3. Vérifier le PIN contre le personnel actif du restaurant
  const pinHash = hashPin(input.pin);
  const { data: perso } = await supabase
    .from("personnel")
    .select("id, pin_hash")
    .eq("restaurant_id", inst.restaurant_id)
    .eq("actif", true);

  // ⚠️ Adapter le nom de colonne `pin_hash` au schéma M07 réel
  const matched = (perso ?? []).find((p: { pin_hash: string }) => p.pin_hash === pinHash);
  if (!matched) return { ok: false, error: "PIN invalide" };

  // 4. Upload photo si fournie
  let photoUrl: string | null = null;
  if (input.photoFile) {
    const path = `${inst.restaurant_id}/${input.instanceId}/${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("qhs-photos")
      .upload(path, input.photoFile, { contentType: "image/jpeg" });
    if (upErr) return { ok: false, error: `Upload photo échoué: ${upErr.message}` };
    photoUrl = path;
  }

  // 5. Insert validation
  const { data: val, error: e3 } = await supabase
    .from("qhs_task_validations")
    .insert({
      instance_id: input.instanceId,
      user_id: (matched as { id: string }).id,
      pin_used_hash: pinHash,
      photo_url: photoUrl,
      commentaire: input.commentaire ?? null,
    })
    .select("id")
    .single();
  if (e3 || !val) return { ok: false, error: "Insertion validation échouée" };

  // 6. Update instance
  const { error: e4 } = await supabase
    .from("qhs_task_instances")
    .update({ statut: "validee", validation_id: (val as { id: string }).id })
    .eq("id", input.instanceId);
  if (e4) return { ok: false, error: "Update instance échoué" };

  return { ok: true };
}

export async function closeNonConformity(
  ncId: string,
  pin: string,
  actionCorrective: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createUntypedClient();

  const { data: nc } = await supabase
    .from("qhs_nonconformities")
    .select("id, restaurant_id")
    .eq("id", ncId)
    .maybeSingle();
  if (!nc) return { ok: false, error: "Non-conformité introuvable" };

  const pinHash = hashPin(pin);
  const { data: perso } = await supabase
    .from("personnel")
    .select("id, pin_hash, role")
    .eq("restaurant_id", (nc as { restaurant_id: string }).restaurant_id)
    .eq("actif", true);

  const matched = (perso ?? []).find(
    (p: { pin_hash: string; role: string }) =>
      p.pin_hash === pinHash && ["admin", "responsable_site"].includes(p.role),
  );
  if (!matched) return { ok: false, error: "PIN invalide ou rôle insuffisant" };

  const { error } = await supabase
    .from("qhs_nonconformities")
    .update({
      statut: "cloturee",
      action_corrective: actionCorrective,
      traite_par: (matched as { id: string }).id,
      traite_at: new Date().toISOString(),
    })
    .eq("id", ncId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertTemplate(template: Partial<QhsTaskTemplate>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from("qhs_task_templates")
    .upsert(template)
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Upsert échoué" };
  return { ok: true, id: (data as { id: string }).id };
}

export async function importFromLibrary(
  restaurantId: string,
  libraryTemplateIds: string[],
  zoneAssignments: Record<string, string>,  // libTplId → zoneId
): Promise<{ ok: true; count: number }> {
  const supabase = createUntypedClient();
  const { data: libs } = await supabase
    .from("qhs_task_templates")
    .select("*")
    .in("id", libraryTemplateIds);

  const rows = (libs ?? []).map((l: QhsTaskTemplate) => ({
    ...l,
    id: undefined,
    restaurant_id: restaurantId,
    zone_id: zoneAssignments[l.id] ?? null,
    created_at: undefined,
    updated_at: undefined,
  }));

  if (rows.length > 0) {
    await supabase.from("qhs_task_templates").insert(rows);
  }
  return { ok: true, count: rows.length };
}
```

⚠️ **Important** : adapter le hash PIN au format réellement utilisé par M07 (mémoire projet "M07 schéma DB, types manuels, createUntypedClient workaround"). Si M07 utilise bcrypt, remplacer `createHash` par `bcrypt.compare`.

- [ ] **Step 2: Compilation**

```bash
cd resto-360 && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add resto-360/src/lib/supabase/qhs/mutations.ts
git commit -m "feat(m08): qhs mutations (validate, close nc, import library)"
```

---

## Task 5 : Export PDF `lib/qhs/pdf-export.ts`

**Files:**
- Create: `resto-360/src/lib/qhs/pdf-export.ts`

- [ ] **Step 1: Écrire le générateur PDF**

```typescript
// src/lib/qhs/pdf-export.ts
import {
  Document, Page, Text, View, StyleSheet, pdf,
} from "@react-pdf/renderer";
import React from "react";
import type {
  QhsTaskInstanceWithContext, QhsNonConformity,
} from "@/lib/supabase/qhs/types";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 16, marginBottom: 10, fontWeight: "bold" },
  h2: { fontSize: 12, marginTop: 15, marginBottom: 6, fontWeight: "bold" },
  meta: { fontSize: 9, color: "#666", marginBottom: 12 },
  row: { flexDirection: "row", borderBottom: "1px solid #ddd", paddingVertical: 3 },
  cellDate:   { width: "15%" },
  cellTask:   { width: "30%" },
  cellZone:   { width: "15%" },
  cellStatut: { width: "15%" },
  cellUser:   { width: "25%" },
  header:     { fontWeight: "bold", borderBottom: "2px solid #000" },
  footer:     { position: "absolute", bottom: 20, left: 30, right: 30, fontSize: 8, color: "#999", textAlign: "center" },
});

export interface AuditPdfData {
  restaurantNom: string;
  periodeDebut: string;
  periodeFin: string;
  instances: QhsTaskInstanceWithContext[];
  nonConformities: QhsNonConformity[];
}

const AuditDoc: React.FC<AuditPdfData> = ({
  restaurantNom, periodeDebut, periodeFin, instances, nonConformities,
}) => {
  const total = instances.length;
  const validees = instances.filter((i) => i.statut === "validee").length;
  const taux = total === 0 ? 100 : Math.round((validees / total) * 100);

  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.h1 }, `Registre HACCP — ${restaurantNom}`),
      React.createElement(Text, { style: styles.meta },
        `Période : ${periodeDebut} → ${periodeFin}  |  Taux de conformité : ${taux}% (${validees}/${total})`),

      React.createElement(Text, { style: styles.h2 }, "Tâches exécutées"),
      React.createElement(View, { style: [styles.row, styles.header] },
        React.createElement(Text, { style: styles.cellDate }, "Date"),
        React.createElement(Text, { style: styles.cellTask }, "Tâche"),
        React.createElement(Text, { style: styles.cellZone }, "Zone"),
        React.createElement(Text, { style: styles.cellStatut }, "Statut"),
        React.createElement(Text, { style: styles.cellUser }, "Validateur")),
      ...instances.map((inst) =>
        React.createElement(View, { style: styles.row, key: inst.id },
          React.createElement(Text, { style: styles.cellDate }, inst.date_prevue),
          React.createElement(Text, { style: styles.cellTask }, inst.template.libelle),
          React.createElement(Text, { style: styles.cellZone }, inst.zone?.nom ?? "—"),
          React.createElement(Text, { style: styles.cellStatut }, inst.statut),
          React.createElement(Text, { style: styles.cellUser }, inst.validation_id ? "Signée" : "—"))),

      React.createElement(Text, { style: styles.h2 }, `Non-conformités (${nonConformities.length})`),
      ...nonConformities.map((nc) =>
        React.createElement(View, { style: styles.row, key: nc.id },
          React.createElement(Text, { style: styles.cellDate }, nc.date_constat.slice(0, 10)),
          React.createElement(Text, { style: { width: "60%" } }, `[G${nc.gravite}] ${nc.description}`),
          React.createElement(Text, { style: { width: "25%" } }, nc.statut))),

      React.createElement(Text, { style: styles.footer },
        `Document généré par Resto360 le ${new Date().toLocaleString("fr-FR")}`),
    ));
};

export async function generateAuditPdf(data: AuditPdfData): Promise<Blob> {
  return await pdf(React.createElement(AuditDoc, data) as any).toBlob();
}
```

- [ ] **Step 2: Compilation**

```bash
cd resto-360 && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add resto-360/src/lib/qhs/pdf-export.ts
git commit -m "feat(m08): pdf audit export with @react-pdf/renderer"
```

---

## Task 6 : Server Actions `qualite/actions.ts`

**Files:**
- Create: `resto-360/src/app/(dashboard)/quotidien/qualite/actions.ts`

- [ ] **Step 1: Écrire les server actions**

```typescript
// src/app/(dashboard)/quotidien/qualite/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import {
  validateTask, closeNonConformity, upsertTemplate, importFromLibrary,
} from "@/lib/supabase/qhs/mutations";
import type { QhsTaskTemplate } from "@/lib/supabase/qhs/types";

export async function validateTaskAction(formData: FormData) {
  const instanceId = String(formData.get("instanceId"));
  const pin = String(formData.get("pin"));
  const commentaire = formData.get("commentaire") ? String(formData.get("commentaire")) : undefined;
  const photoFile = formData.get("photo") as File | null;

  const result = await validateTask({
    instanceId,
    pin,
    photoFile: photoFile && photoFile.size > 0 ? photoFile : null,
    commentaire,
  });

  if (result.ok) revalidatePath("/quotidien/qualite/nettoyage");
  return result;
}

export async function closeNcAction(formData: FormData) {
  const ncId = String(formData.get("ncId"));
  const pin = String(formData.get("pin"));
  const action = String(formData.get("action_corrective"));
  const result = await closeNonConformity(ncId, pin, action);
  if (result.ok) revalidatePath("/quotidien/qualite/nettoyage/admin");
  return result;
}

export async function upsertTemplateAction(template: Partial<QhsTaskTemplate>) {
  const result = await upsertTemplate(template);
  if (result.ok) revalidatePath("/quotidien/qualite/nettoyage/admin");
  return result;
}

export async function importFromLibraryAction(
  restaurantId: string,
  libraryIds: string[],
  zoneAssignments: Record<string, string>,
) {
  const result = await importFromLibrary(restaurantId, libraryIds, zoneAssignments);
  revalidatePath("/quotidien/qualite/nettoyage/admin");
  return result;
}
```

- [ ] **Step 2: Compilation**

```bash
cd resto-360 && npx tsc --noEmit && npx vitest run
```

Expected: tests passent (8/8 pour creneaux), pas d'erreur TS.

- [ ] **Step 3: Commit**

```bash
git add resto-360/src/app/\(dashboard\)/quotidien/qualite/actions.ts
git commit -m "feat(m08): server actions for task validation and admin"
```

---

## Vérification finale du chunk B

- [ ] `npx tsc --noEmit` clean
- [ ] `npx vitest run` : tous tests passent (creneaux 8/8)
- [ ] 6 fichiers créés, 6 commits
- [ ] Pattern `createUntypedClient` réutilisé (cohérent avec M07)
- [ ] Pas de `.select(*, joined_table(*))` — règle no-joins respectée
- [ ] Pas de placeholder

## Self-review

✅ Spec coverage : 5 (types), 6.1 (créneaux), 6.4 (validation PIN+photo), 6.5 (export PDF). Section 6.3 (escalade) → couverte chunk A.
⚠️ Points à valider en exécution : nom exact de la colonne PIN dans `personnel` (M07), helper `createUntypedClient` localisation exacte, role enum personnel (`admin` / `responsable_site`).
✅ Types cohérents entre `types.ts`, `queries.ts`, `mutations.ts`, `pdf-export.ts`.
✅ TDD appliqué sur la logique pure (`creneaux.ts`). Mutations testées via parcours UI au chunk C.
