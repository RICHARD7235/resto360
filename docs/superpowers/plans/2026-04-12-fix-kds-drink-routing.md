# Fix KDS Drink Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les commandes boissons doivent aller uniquement au KDS Bar (pas Cuisine), avec un fallback configurable via `is_default` sur `preparation_stations`.

**Architecture:** Migration SQL pour ajouter `is_default` sur `preparation_stations` + mise a jour `default_station_id` de la catégorie Boissons vers Bar. Modification du fallback dans `preparation-tickets.ts` pour utiliser `is_default` au lieu de `display_order ASC`. Mise a jour des types TypeScript.

**Tech Stack:** Supabase (PostgreSQL), Next.js 16, TypeScript

---

### Task 1: Migration SQL — `is_default` + fix catégorie Boissons

**Files:**
- Create: `supabase/migrations/20260412_fix_drink_station_routing.sql`

- [ ] **Step 1: Créer le fichier de migration**

```sql
-- Migration: Fix KDS drink routing
-- Date: 2026-04-12
-- Description: Add is_default column to preparation_stations and set Boissons category to Bar station

-- 1. Add is_default column
ALTER TABLE preparation_stations ADD COLUMN is_default boolean NOT NULL DEFAULT false;

-- 2. Mark Cuisine as the default fallback station for each restaurant
UPDATE preparation_stations SET is_default = true WHERE name = 'Cuisine';

-- 3. Set Boissons category default_station_id to Bar station
UPDATE menu_categories mc
SET default_station_id = ps.id
FROM preparation_stations ps
WHERE ps.restaurant_id = mc.restaurant_id
  AND ps.name = 'Bar'
  AND mc.name = 'Boissons';
```

- [ ] **Step 2: Appliquer la migration sur Supabase**

Utiliser le MCP Supabase `execute_sql` pour exécuter la migration sur le projet `vymwkwziytcetjlvtbcc`.

- [ ] **Step 3: Vérifier la migration**

Exécuter ces requêtes de vérification :

```sql
-- Vérifier is_default
SELECT name, is_default, display_order FROM preparation_stations;

-- Vérifier Boissons → Bar
SELECT mc.name AS category, ps.name AS station
FROM menu_categories mc
JOIN preparation_stations ps ON ps.id = mc.default_station_id
WHERE mc.name = 'Boissons';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260412_fix_drink_station_routing.sql
git commit -m "feat(m03): add is_default to preparation_stations + fix Boissons→Bar routing"
```

---

### Task 2: Mettre à jour les types TypeScript

**Files:**
- Modify: `src/types/database.types.ts:379-416` (preparation_stations Row/Insert/Update)

- [ ] **Step 1: Ajouter `is_default` au type Row**

Dans `preparation_stations.Row` (ligne ~380), ajouter :

```typescript
Row: {
  color: string
  created_at: string
  display_order: number
  id: string
  is_active: boolean
  is_default: boolean
  name: string
  restaurant_id: string
}
```

- [ ] **Step 2: Ajouter `is_default` au type Insert**

Dans `preparation_stations.Insert` (ligne ~389), ajouter :

```typescript
Insert: {
  color?: string
  created_at?: string
  display_order?: number
  id?: string
  is_active?: boolean
  is_default?: boolean
  name: string
  restaurant_id: string
}
```

- [ ] **Step 3: Ajouter `is_default` au type Update**

Dans `preparation_stations.Update` (ligne ~398), ajouter :

```typescript
Update: {
  color?: string
  created_at?: string
  display_order?: number
  id?: string
  is_active?: boolean
  is_default?: boolean
  name?: string
  restaurant_id?: string
}
```

- [ ] **Step 4: Vérifier le build**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npx tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 5: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): add is_default to preparation_stations type"
```

---

### Task 3: Modifier le fallback dans `preparation-tickets.ts`

**Files:**
- Modify: `src/lib/preparation-tickets.ts:83-99` (createPreparationTickets fallback)
- Modify: `src/lib/preparation-tickets.ts:169-184` (addItemsToPreparationTickets fallback)

- [ ] **Step 1: Extraire une fonction helper `getDefaultStation`**

Ajouter cette fonction en haut du fichier (après les imports, avant `resolveStationsForProducts`) :

```typescript
/**
 * Returns the default fallback station for a restaurant.
 * Priority: station with is_default=true > first by display_order.
 */
async function getDefaultStation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string
): Promise<string | null> {
  // Try explicit default first
  const { data: defaultStation } = await supabase
    .from("preparation_stations")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (defaultStation) return defaultStation.id;

  // Fallback: first by display_order (backward compat)
  const { data: firstStation } = await supabase
    .from("preparation_stations")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return firstStation?.id ?? null;
}
```

- [ ] **Step 2: Remplacer le fallback dans `createPreparationTickets`**

Remplacer les lignes 83-99 :

**Avant :**
```typescript
  // For unassigned items, assign to the first station (Cuisine by default)
  if (unassigned.length > 0) {
    const { data: defaultStation } = await supabase
      .from("preparation_stations")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(1)
      .single();

    if (defaultStation) {
      const existing = itemsByStation.get(defaultStation.id) ?? [];
      existing.push(...unassigned);
      itemsByStation.set(defaultStation.id, existing);
    }
  }
```

**Après :**
```typescript
  // For unassigned items, assign to the default station
  if (unassigned.length > 0) {
    const defaultStationId = await getDefaultStation(supabase, restaurantId);

    if (defaultStationId) {
      const existing = itemsByStation.get(defaultStationId) ?? [];
      existing.push(...unassigned);
      itemsByStation.set(defaultStationId, existing);
    } else {
      console.warn(`[KDS] No default station found for restaurant ${restaurantId}. ${unassigned.length} items unrouted.`);
    }
  }
```

- [ ] **Step 3: Remplacer le fallback dans `addItemsToPreparationTickets`**

Remplacer les lignes 168-184 :

**Avant :**
```typescript
  // Handle unassigned
  if (unassigned.length > 0) {
    const { data: defaultStation } = await supabase
      .from("preparation_stations")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(1)
      .single();

    if (defaultStation) {
      const existing = itemsByStation.get(defaultStation.id) ?? [];
      existing.push(...unassigned);
      itemsByStation.set(defaultStation.id, existing);
    }
  }
```

**Après :**
```typescript
  // Handle unassigned
  if (unassigned.length > 0) {
    const defaultStationId = await getDefaultStation(supabase, restaurantId);

    if (defaultStationId) {
      const existing = itemsByStation.get(defaultStationId) ?? [];
      existing.push(...unassigned);
      itemsByStation.set(defaultStationId, existing);
    } else {
      console.warn(`[KDS] No default station found for restaurant ${restaurantId}. ${unassigned.length} items unrouted.`);
    }
  }
```

- [ ] **Step 4: Vérifier le build**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npx tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 5: Commit**

```bash
git add src/lib/preparation-tickets.ts
git commit -m "fix(m03): use is_default station for KDS fallback instead of display_order"
```

---

### Task 4: Vérification end-to-end

- [ ] **Step 1: Build complet**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npm run build`
Expected: Build succeeds without errors

- [ ] **Step 2: Test manuel — commande boisson**

1. Ouvrir l'app sur `/commandes/nouvelle`
2. Ajouter un article de catégorie "Boissons" à une commande
3. Valider la commande
4. Aller sur `/commandes/cuisine` — la boisson ne doit PAS apparaître
5. Vérifier en DB que le `preparation_ticket` de la boisson est lié à la station Bar

```sql
SELECT oi.product_name, pt.station_id, ps.name AS station_name
FROM order_items oi
JOIN preparation_tickets pt ON pt.id = oi.preparation_ticket_id
JOIN preparation_stations ps ON ps.id = pt.station_id
ORDER BY oi.created_at DESC
LIMIT 10;
```

- [ ] **Step 3: Test fallback — produit sans catégorie**

Vérifier qu'un produit sans `station_id` ni `category.default_station_id` va vers la station `is_default=true` (Cuisine).

- [ ] **Step 4: Commit final si ajustements**

```bash
git add -A
git commit -m "test(m03): verify drink routing to Bar station"
```
