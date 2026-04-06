# Preparation Stations & Ticket Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable preparation stations (Cuisine, Bar, etc.) and automatic ticket splitting so each station only sees its own items on the KDS.

**Architecture:** Two new DB tables (`preparation_stations`, `preparation_tickets`) + columns on existing tables. Order creation splits items by station into separate tickets. KDS reads tickets per station. Floor plan shows per-station badges. New admin page for station CRUD.

**Tech Stack:** Next.js 16 (App Router), Supabase (PostgreSQL + RLS), TypeScript strict, Zustand, Tailwind CSS 4, shadcn/ui (v4 render prop pattern)

**Spec:** `docs/superpowers/specs/2026-04-06-preparation-stations-design.md`

---

## File Structure

### New Files
- `supabase/migrations/XXXXXX_preparation_stations.sql` — DB migration
- `src/app/(dashboard)/admin-operationnelle/page.tsx` — Admin page
- `src/app/(dashboard)/admin-operationnelle/actions.ts` — Server actions for stations CRUD
- `src/components/modules/admin/station-list.tsx` — Station list with CRUD
- `src/components/modules/admin/station-form.tsx` — Station create/edit dialog
- `src/app/(dashboard)/commandes/cuisine/setup/page.tsx` — Tablet station picker
- `src/lib/preparation-tickets.ts` — Ticket split logic (server-side helper)

### Modified Files
- `src/types/database.types.ts` — Add new table types (regenerated)
- `src/app/(dashboard)/commandes/actions.ts` — createOrder split, new ticket queries
- `src/app/(dashboard)/commandes/cuisine/page.tsx` — Station filtering + supervisor tabs
- `src/components/modules/commandes/kitchen-board.tsx` — Accept tickets instead of orders
- `src/components/modules/commandes/kitchen-ticket.tsx` — Accept ticket data, station actions
- `src/components/modules/commandes/floor-plan.tsx` — Station status badges
- `src/components/modules/commandes/table-card.tsx` — Station badges display
- `src/components/modules/carte/product-form.tsx` — Station select field
- `src/app/(dashboard)/carte/actions.ts` — Category station field
- `src/components/layout/app-sidebar.tsx` — Add admin-operationnelle route
- `src/app/(dashboard)/commandes/page.tsx` — Floor plan station badges

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260406_preparation_stations.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/20260406_preparation_stations.sql

-- 1. Create preparation_stations table
CREATE TABLE preparation_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6B7280',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create preparation_tickets table
CREATE TABLE preparation_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES preparation_stations(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'ready', 'served')),
  started_at timestamptz,
  ready_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, station_id)
);

-- 3. Add columns to existing tables
ALTER TABLE menu_categories ADD COLUMN default_station_id uuid REFERENCES preparation_stations(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN station_id uuid REFERENCES preparation_stations(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN preparation_ticket_id uuid REFERENCES preparation_tickets(id) ON DELETE SET NULL;

-- 4. RLS policies for preparation_stations
ALTER TABLE preparation_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stations of their restaurant"
  ON preparation_stations FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can insert stations for their restaurant"
  ON preparation_stations FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can update stations of their restaurant"
  ON preparation_stations FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can delete stations of their restaurant"
  ON preparation_stations FOR DELETE
  USING (restaurant_id = get_user_restaurant_id());

-- 5. RLS policies for preparation_tickets
ALTER TABLE preparation_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tickets via orders of their restaurant"
  ON preparation_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = preparation_tickets.order_id
      AND orders.restaurant_id = get_user_restaurant_id()
    )
  );

CREATE POLICY "Users can insert tickets for their restaurant orders"
  ON preparation_tickets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = preparation_tickets.order_id
      AND orders.restaurant_id = get_user_restaurant_id()
    )
  );

CREATE POLICY "Users can update tickets for their restaurant orders"
  ON preparation_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = preparation_tickets.order_id
      AND orders.restaurant_id = get_user_restaurant_id()
    )
  );

-- 6. Indexes
CREATE INDEX idx_preparation_stations_restaurant ON preparation_stations(restaurant_id);
CREATE INDEX idx_preparation_tickets_order ON preparation_tickets(order_id);
CREATE INDEX idx_preparation_tickets_station ON preparation_tickets(station_id);
CREATE INDEX idx_preparation_tickets_status ON preparation_tickets(status);
CREATE INDEX idx_order_items_ticket ON order_items(preparation_ticket_id);

-- 7. Seed default stations for existing restaurants
INSERT INTO preparation_stations (restaurant_id, name, display_order, color, is_active)
SELECT id, 'Cuisine', 1, '#E85D26', true FROM restaurants
UNION ALL
SELECT id, 'Bar', 2, '#3B82F6', true FROM restaurants;
```

- [ ] **Step 2: Apply migration via Supabase CLI**

Run: `npx supabase db push` (or apply via Supabase Dashboard SQL editor if no local CLI setup)
Expected: Tables created, seed data inserted, RLS policies active.

- [ ] **Step 3: Regenerate TypeScript types**

Run: `npx supabase gen types typescript --project-id vymwkwziytcetjlvtbcc > src/types/database.types.ts`
Expected: New types for `preparation_stations` and `preparation_tickets` appear in the file. Existing types for `menu_categories`, `products`, and `order_items` include new columns.

- [ ] **Step 4: Verify types compiled correctly**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors (existing nullable field errors may remain — do not fix unrelated ones).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260406_preparation_stations.sql src/types/database.types.ts
git commit -m "feat(db): add preparation_stations and preparation_tickets tables with RLS"
```

---

## Task 2: Station CRUD Server Actions

**Files:**
- Create: `src/app/(dashboard)/admin-operationnelle/actions.ts`

- [ ] **Step 1: Create the server actions file**

```typescript
// src/app/(dashboard)/admin-operationnelle/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Tables } from "@/types/database.types";

type StationRow = Tables<"preparation_stations">;

async function getUserRestaurantId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.restaurant_id) {
    throw new Error("Aucun restaurant associe a votre compte.");
  }

  return profile.restaurant_id;
}

export async function getStations(): Promise<StationRow[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("preparation_stations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Erreur chargement des postes : ${error.message}`);
  }

  return data ?? [];
}

export async function getActiveStations(): Promise<StationRow[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("preparation_stations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Erreur chargement des postes actifs : ${error.message}`);
  }

  return data ?? [];
}

export async function createStation(input: {
  name: string;
  color: string;
  display_order: number;
}): Promise<StationRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("preparation_stations")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      color: input.color,
      display_order: input.display_order,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur creation du poste : ${error.message}`);
  }

  return data;
}

export async function updateStation(
  id: string,
  updates: { name?: string; color?: string; display_order?: number; is_active?: boolean }
): Promise<StationRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("preparation_stations")
    .update(updates)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur mise a jour du poste : ${error.message}`);
  }

  return data;
}

export async function deleteStation(id: string): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Check for active tickets
  const { data: activeTickets } = await supabase
    .from("preparation_tickets")
    .select("id")
    .eq("station_id", id)
    .in("status", ["pending", "in_progress", "ready"])
    .limit(1);

  if (activeTickets && activeTickets.length > 0) {
    throw new Error(
      "Ce poste a des tickets en cours. Terminez-les avant de supprimer."
    );
  }

  // Clear references on products and categories
  await supabase
    .from("products")
    .update({ station_id: null })
    .eq("station_id", id);

  await supabase
    .from("menu_categories")
    .update({ default_station_id: null })
    .eq("default_station_id", id);

  const { error } = await supabase
    .from("preparation_stations")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(`Erreur suppression du poste : ${error.message}`);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npx tsc --noEmit 2>&1 | grep "admin-operationnelle"`
Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin-operationnelle/actions.ts
git commit -m "feat(admin): add station CRUD server actions"
```

---

## Task 3: Station Admin Page & Components

**Files:**
- Create: `src/app/(dashboard)/admin-operationnelle/page.tsx`
- Create: `src/components/modules/admin/station-list.tsx`
- Create: `src/components/modules/admin/station-form.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Create station form dialog**

```typescript
// src/components/modules/admin/station-form.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

const PRESET_COLORS = [
  "#E85D26", "#3B82F6", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#6B7280", "#EF4444",
];

interface StationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station | null;
  onSubmit: (data: { name: string; color: string; display_order: number }) => void;
  loading?: boolean;
  nextOrder: number;
}

export function StationForm({
  open,
  onOpenChange,
  station,
  onSubmit,
  loading = false,
  nextOrder,
}: StationFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (station) {
      setName(station.name);
      setColor(station.color ?? PRESET_COLORS[0]);
    } else {
      setName("");
      setColor(PRESET_COLORS[0]);
    }
  }, [station, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      color,
      display_order: station?.display_order ?? nextOrder,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {station ? "Modifier le poste" : "Nouveau poste"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="station-name">Nom du poste *</Label>
            <Input
              id="station-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Grill, Desserts..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`size-8 rounded-full border-2 transition-all ${
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !name}>
              {loading ? "Enregistrement..." : station ? "Mettre a jour" : "Creer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create station list component**

```typescript
// src/components/modules/admin/station-list.tsx
"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StationForm } from "./station-form";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

interface StationListProps {
  stations: Station[];
  onCreateStation: (data: { name: string; color: string; display_order: number }) => Promise<void>;
  onUpdateStation: (id: string, updates: { name?: string; color?: string; is_active?: boolean }) => Promise<void>;
  onDeleteStation: (id: string) => Promise<void>;
}

export function StationList({
  stations,
  onCreateStation,
  onUpdateStation,
  onDeleteStation,
}: StationListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: { name: string; color: string; display_order: number }) {
    setLoading(true);
    try {
      if (editingStation) {
        await onUpdateStation(editingStation.id, { name: data.name, color: data.color });
      } else {
        await onCreateStation(data);
      }
      setFormOpen(false);
      setEditingStation(null);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(station: Station) {
    setEditingStation(station);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingStation(null);
    setFormOpen(true);
  }

  async function handleToggle(station: Station) {
    await onUpdateStation(station.id, { is_active: !(station.is_active ?? true) });
  }

  async function handleDelete(station: Station) {
    if (!confirm(`Supprimer le poste "${station.name}" ?`)) return;
    await onDeleteStation(station.id);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Postes de preparation</CardTitle>
          <Button className="min-h-11 gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Nouveau poste
          </Button>
        </CardHeader>
        <CardContent>
          {stations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun poste configure
            </p>
          ) : (
            <div className="space-y-2">
              {stations.map((station) => (
                <div
                  key={station.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div
                    className="size-4 shrink-0 rounded-full"
                    style={{ backgroundColor: station.color ?? "#6B7280" }}
                  />
                  <span className="flex-1 font-medium">{station.name}</span>
                  <Switch
                    checked={station.is_active ?? true}
                    onCheckedChange={() => handleToggle(station)}
                    aria-label={`Activer ${station.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px]"
                    onClick={() => handleEdit(station)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px] text-destructive"
                    onClick={() => handleDelete(station)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <StationForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingStation(null);
        }}
        station={editingStation}
        onSubmit={handleSubmit}
        loading={loading}
        nextOrder={stations.length + 1}
      />
    </>
  );
}
```

- [ ] **Step 3: Create admin page**

```typescript
// src/app/(dashboard)/admin-operationnelle/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { StationList } from "@/components/modules/admin/station-list";
import {
  getStations,
  createStation,
  updateStation,
  deleteStation,
} from "./actions";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

export default function AdminOperationnellePage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStations = useCallback(async () => {
    try {
      const data = await getStations();
      setStations(data);
    } catch (error) {
      console.error("Erreur chargement postes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  async function handleCreate(data: { name: string; color: string; display_order: number }) {
    await createStation(data);
    await fetchStations();
  }

  async function handleUpdate(id: string, updates: { name?: string; color?: string; is_active?: boolean }) {
    await updateStation(id, updates);
    await fetchStations();
  }

  async function handleDelete(id: string) {
    await deleteStation(id);
    await fetchStations();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Administration operationnelle
        </h1>
        <p className="text-muted-foreground">
          Configuration des postes de preparation et du service
        </p>
      </div>

      <StationList
        stations={stations}
        onCreateStation={handleCreate}
        onUpdateStation={handleUpdate}
        onDeleteStation={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 4: Add route to sidebar**

In `src/components/layout/app-sidebar.tsx`, add a new group after "Croissance":

Add import at top:
```typescript
import { Settings } from "lucide-react";
```

Add new group to the `modules` array after the "Croissance" group:
```typescript
{
  group: "Configuration",
  items: [
    { name: "Admin operationnelle", href: "/admin-operationnelle", icon: Settings },
  ],
},
```

- [ ] **Step 5: Verify the page renders**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npm run build 2>&1 | tail -20`
Expected: Build succeeds. The `/admin-operationnelle` route is compiled.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/admin-operationnelle/ src/components/modules/admin/ src/components/layout/app-sidebar.tsx
git commit -m "feat(admin): add station management page with CRUD"
```

---

## Task 4: Ticket Split Logic

**Files:**
- Create: `src/lib/preparation-tickets.ts`

- [ ] **Step 1: Create the ticket split helper**

```typescript
// src/lib/preparation-tickets.ts
import { createClient } from "@/lib/supabase/server";

interface ItemWithStation {
  order_item_id: string;
  product_id: string | null;
  station_id: string | null; // resolved station
}

/**
 * Resolves the preparation station for a product.
 * Priority: product.station_id > category.default_station_id > null
 */
export async function resolveStationForProduct(
  productId: string | null
): Promise<string | null> {
  if (!productId) return null;

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("station_id, category_id")
    .eq("id", productId)
    .single();

  if (!product) return null;

  // Direct station override on product
  if (product.station_id) return product.station_id;

  // Fallback to category default
  if (product.category_id) {
    const { data: category } = await supabase
      .from("menu_categories")
      .select("default_station_id")
      .eq("id", product.category_id)
      .single();

    if (category?.default_station_id) return category.default_station_id;
  }

  return null;
}

/**
 * Resolves stations for multiple products in batch (fewer queries).
 */
export async function resolveStationsForProducts(
  productIds: (string | null)[]
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const uniqueIds = [...new Set(productIds.filter((id): id is string => id !== null))];

  if (uniqueIds.length === 0) return result;

  const supabase = await createClient();

  // Fetch all products at once
  const { data: products } = await supabase
    .from("products")
    .select("id, station_id, category_id")
    .in("id", uniqueIds);

  if (!products) return result;

  // Collect category IDs that need lookup
  const categoryIds = products
    .filter((p) => !p.station_id && p.category_id)
    .map((p) => p.category_id!)
    .filter((id, i, arr) => arr.indexOf(id) === i);

  // Fetch categories with default_station_id
  let categoryStations = new Map<string, string | null>();
  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("id, default_station_id")
      .in("id", categoryIds);

    for (const cat of categories ?? []) {
      categoryStations.set(cat.id, cat.default_station_id ?? null);
    }
  }

  // Resolve each product
  for (const product of products) {
    const station = product.station_id
      ?? (product.category_id ? categoryStations.get(product.category_id) ?? null : null);
    result.set(product.id, station);
  }

  return result;
}

/**
 * Creates preparation tickets for an order by splitting items by station.
 * Returns the ticket IDs mapped by station.
 */
export async function createPreparationTickets(
  orderId: string,
  items: { order_item_id: string; product_id: string | null }[],
  restaurantId: string
): Promise<void> {
  const supabase = await createClient();

  // Resolve stations
  const productIds = items.map((i) => i.product_id);
  const stationMap = await resolveStationsForProducts(productIds);

  // Group items by station
  const itemsByStation = new Map<string, string[]>(); // station_id -> order_item_ids
  const unassigned: string[] = [];

  for (const item of items) {
    const stationId = item.product_id ? stationMap.get(item.product_id) ?? null : null;
    if (stationId) {
      const existing = itemsByStation.get(stationId) ?? [];
      existing.push(item.order_item_id);
      itemsByStation.set(stationId, existing);
    } else {
      unassigned.push(item.order_item_id);
    }
  }

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

  // Create tickets and link items
  for (const [stationId, orderItemIds] of itemsByStation) {
    const { data: ticket, error: ticketError } = await supabase
      .from("preparation_tickets")
      .insert({
        order_id: orderId,
        station_id: stationId,
        status: "pending",
      })
      .select()
      .single();

    if (ticketError) {
      throw new Error(`Erreur creation ticket: ${ticketError.message}`);
    }

    // Link order items to this ticket
    const { error: linkError } = await supabase
      .from("order_items")
      .update({ preparation_ticket_id: ticket.id })
      .in("id", orderItemIds);

    if (linkError) {
      throw new Error(`Erreur liaison items au ticket: ${linkError.message}`);
    }
  }
}

/**
 * Adds items to existing preparation tickets or creates new ones.
 */
export async function addItemsToPreparationTickets(
  orderId: string,
  items: { order_item_id: string; product_id: string | null }[],
  restaurantId: string
): Promise<void> {
  const supabase = await createClient();

  // Resolve stations
  const productIds = items.map((i) => i.product_id);
  const stationMap = await resolveStationsForProducts(productIds);

  // Get existing tickets for this order
  const { data: existingTickets } = await supabase
    .from("preparation_tickets")
    .select("id, station_id, status")
    .eq("order_id", orderId);

  const ticketByStation = new Map<string, { id: string; status: string }>();
  for (const t of existingTickets ?? []) {
    ticketByStation.set(t.station_id, { id: t.id, status: t.status ?? "pending" });
  }

  // Group items by station
  const itemsByStation = new Map<string, string[]>();
  const unassigned: string[] = [];

  for (const item of items) {
    const stationId = item.product_id ? stationMap.get(item.product_id) ?? null : null;
    if (stationId) {
      const existing = itemsByStation.get(stationId) ?? [];
      existing.push(item.order_item_id);
      itemsByStation.set(stationId, existing);
    } else {
      unassigned.push(item.order_item_id);
    }
  }

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

  // For each station, use existing ticket or create new
  for (const [stationId, orderItemIds] of itemsByStation) {
    const existingTicket = ticketByStation.get(stationId);

    let ticketId: string;

    if (existingTicket && existingTicket.status !== "served") {
      ticketId = existingTicket.id;
      // Reset to in_progress if was ready
      if (existingTicket.status === "ready") {
        await supabase
          .from("preparation_tickets")
          .update({ status: "in_progress", ready_at: null })
          .eq("id", ticketId);
      }
    } else {
      // Create new ticket
      const { data: ticket, error } = await supabase
        .from("preparation_tickets")
        .insert({
          order_id: orderId,
          station_id: stationId,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erreur creation ticket: ${error.message}`);
      }
      ticketId = ticket.id;
    }

    // Link items
    const { error: linkError } = await supabase
      .from("order_items")
      .update({ preparation_ticket_id: ticketId })
      .in("id", orderItemIds);

    if (linkError) {
      throw new Error(`Erreur liaison items: ${linkError.message}`);
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npx tsc --noEmit 2>&1 | grep "preparation-tickets"`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/preparation-tickets.ts
git commit -m "feat(orders): add preparation ticket split logic"
```

---

## Task 5: Integrate Ticket Split into Order Creation

**Files:**
- Modify: `src/app/(dashboard)/commandes/actions.ts`

- [ ] **Step 1: Add import and new types**

At the top of `src/app/(dashboard)/commandes/actions.ts`, after existing imports, add:

```typescript
import {
  createPreparationTickets,
  addItemsToPreparationTickets,
} from "@/lib/preparation-tickets";
```

Add new types after the existing type declarations (after `OrderStats`):

```typescript
export type PreparationTicketStatus = "pending" | "in_progress" | "ready" | "served";

export interface PreparationTicketWithItems {
  id: string;
  order_id: string;
  station_id: string;
  station_name: string;
  station_color: string;
  status: string;
  started_at: string | null;
  ready_at: string | null;
  created_at: string;
  table_number: string | null;
  order_notes: string | null;
  items: {
    id: string;
    product_name: string;
    quantity: number;
    notes: string | null;
    status: string;
  }[];
}
```

- [ ] **Step 2: Add createPreparationTickets call to createOrder**

In the `createOrder` function, after the successful order items insertion (after line `return { ...order, order_items: orderItems ?? [] };`), but BEFORE the return, add the ticket split call:

Replace the return statement at end of `createOrder` (the line `return { ...order, order_items: orderItems ?? [] };`) with:

```typescript
  // Create preparation tickets (split by station)
  const itemsForTickets = (orderItems ?? []).map((item) => ({
    order_item_id: item.id,
    product_id: item.product_id,
  }));

  try {
    await createPreparationTickets(order.id, itemsForTickets, restaurantId);
  } catch (error) {
    console.error("Erreur creation tickets preparation:", error);
    // Non-blocking: order is created even if tickets fail
  }

  return { ...order, order_items: orderItems ?? [] };
```

- [ ] **Step 3: Add addItemsToPreparationTickets call to addItemsToOrder**

In the `addItemsToOrder` function, after the new items are inserted and total recalculated, before fetching the full order (before `const result = await getOrder(orderId);`), add:

```typescript
  // Update preparation tickets for new items
  const { data: newItems } = await supabase
    .from("order_items")
    .select("id, product_id")
    .eq("order_id", orderId)
    .is("preparation_ticket_id", null);

  if (newItems && newItems.length > 0) {
    try {
      await addItemsToPreparationTickets(
        orderId,
        newItems.map((item) => ({
          order_item_id: item.id,
          product_id: item.product_id,
        })),
        restaurantId
      );
    } catch (error) {
      console.error("Erreur mise a jour tickets preparation:", error);
    }
  }
```

- [ ] **Step 4: Add new query functions for KDS**

Add these new functions at the end of the Queries section (after `getOrderStats`):

```typescript
export async function getPreparationTickets(
  stationId?: string
): Promise<PreparationTicketWithItems[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  // Get active orders for today
  const { data: orders } = await supabase
    .from("orders")
    .select("id, table_number, notes")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", today)
    .in("status", ["pending", "in_progress", "ready"]);

  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  // Get tickets
  let ticketQuery = supabase
    .from("preparation_tickets")
    .select("*")
    .in("order_id", orderIds)
    .in("status", ["pending", "in_progress", "ready"])
    .order("created_at", { ascending: true });

  if (stationId) {
    ticketQuery = ticketQuery.eq("station_id", stationId);
  }

  const { data: tickets } = await ticketQuery;
  if (!tickets || tickets.length === 0) return [];

  // Get stations
  const stationIds = [...new Set(tickets.map((t) => t.station_id))];
  const { data: stations } = await supabase
    .from("preparation_stations")
    .select("id, name, color")
    .in("id", stationIds);

  const stationMap = new Map(
    (stations ?? []).map((s) => [s.id, { name: s.name, color: s.color ?? "#6B7280" }])
  );

  // Get items for these tickets
  const ticketIds = tickets.map((t) => t.id);
  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_name, quantity, notes, status, preparation_ticket_id")
    .in("preparation_ticket_id", ticketIds);

  const itemsByTicket = new Map<string, typeof items>();
  for (const item of items ?? []) {
    if (!item.preparation_ticket_id) continue;
    const existing = itemsByTicket.get(item.preparation_ticket_id) ?? [];
    existing.push(item);
    itemsByTicket.set(item.preparation_ticket_id, existing);
  }

  return tickets.map((ticket) => {
    const order = orderMap.get(ticket.order_id);
    const station = stationMap.get(ticket.station_id);
    return {
      id: ticket.id,
      order_id: ticket.order_id,
      station_id: ticket.station_id,
      station_name: station?.name ?? "Inconnu",
      station_color: station?.color ?? "#6B7280",
      status: ticket.status ?? "pending",
      started_at: ticket.started_at,
      ready_at: ticket.ready_at,
      created_at: ticket.created_at ?? new Date().toISOString(),
      table_number: order?.table_number ?? null,
      order_notes: order?.notes ?? null,
      items: (itemsByTicket.get(ticket.id) ?? []).map((item) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        notes: item.notes,
        status: item.status ?? "pending",
      })),
    };
  });
}

export async function updatePreparationTicketStatus(
  ticketId: string,
  status: PreparationTicketStatus
): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };

  if (status === "in_progress") {
    updates.started_at = new Date().toISOString();
  } else if (status === "ready") {
    updates.ready_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("preparation_tickets")
    .update(updates)
    .eq("id", ticketId);

  if (error) {
    throw new Error(`Erreur mise a jour ticket: ${error.message}`);
  }

  // Auto-aggregate order status
  const { data: ticket } = await supabase
    .from("preparation_tickets")
    .select("order_id")
    .eq("id", ticketId)
    .single();

  if (!ticket) return;

  const { data: allTickets } = await supabase
    .from("preparation_tickets")
    .select("status")
    .eq("order_id", ticket.order_id);

  if (!allTickets || allTickets.length === 0) return;

  const statuses = allTickets.map((t) => t.status ?? "pending");

  let orderStatus: OrderStatus;
  if (statuses.every((s) => s === "served")) {
    orderStatus = "served";
  } else if (statuses.every((s) => s === "ready" || s === "served")) {
    orderStatus = "ready";
  } else if (statuses.some((s) => s === "in_progress")) {
    orderStatus = "in_progress";
  } else {
    orderStatus = "pending";
  }

  // Get the order to verify restaurant ownership
  const { data: order } = await supabase
    .from("orders")
    .select("restaurant_id")
    .eq("id", ticket.order_id)
    .single();

  if (order?.restaurant_id !== restaurantId) return;

  await supabase
    .from("orders")
    .update({ status: orderStatus, updated_at: new Date().toISOString() })
    .eq("id", ticket.order_id);
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npx tsc --noEmit 2>&1 | grep "actions.ts"`
Expected: No new errors from commandes/actions.ts.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/commandes/actions.ts
git commit -m "feat(orders): integrate ticket split into createOrder and addItemsToOrder"
```

---

## Task 6: Refactor KDS to Use Preparation Tickets

**Files:**
- Modify: `src/app/(dashboard)/commandes/cuisine/page.tsx`
- Modify: `src/components/modules/commandes/kitchen-board.tsx`
- Modify: `src/components/modules/commandes/kitchen-ticket.tsx`

- [ ] **Step 1: Update KitchenTicket to accept ticket data**

Replace the entire content of `src/components/modules/commandes/kitchen-ticket.tsx` with:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TicketItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
  status: string;
}

export interface TicketData {
  id: string;
  order_id: string;
  station_id: string;
  station_name: string;
  station_color: string;
  status: string;
  created_at: string;
  table_number: string | null;
  order_notes: string | null;
  items: TicketItem[];
}

interface KitchenTicketProps {
  ticket: TicketData;
  onItemStatusChange: (itemId: string, status: string) => void;
  onTicketStatusChange: (ticketId: string, status: string) => void;
  showStationBadge?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  pending: { bg: "bg-red-500", text: "text-white", label: "NOUVEAU" },
  in_progress: { bg: "bg-amber-500", text: "text-white", label: "EN PREPA" },
  ready: { bg: "bg-green-500", text: "text-white", label: "PRET" },
} as const;

type KnownStatus = keyof typeof STATUS_CONFIG;

function isKnownStatus(status: string): status is KnownStatus {
  return status in STATUS_CONFIG;
}

function getStatusConfig(status: string) {
  if (isKnownStatus(status)) return STATUS_CONFIG[status];
  return { bg: "bg-muted", text: "text-foreground", label: status.toUpperCase() };
}

function getElapsedMinutes(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
}

function formatElapsed(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KitchenTicket({
  ticket,
  onItemStatusChange,
  onTicketStatusChange,
  showStationBadge = false,
}: KitchenTicketProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(() =>
    getElapsedMinutes(ticket.created_at)
  );

  useEffect(() => {
    setElapsedMinutes(getElapsedMinutes(ticket.created_at));
    const interval = setInterval(() => {
      setElapsedMinutes(getElapsedMinutes(ticket.created_at));
    }, 30_000);
    return () => clearInterval(interval);
  }, [ticket.created_at]);

  const statusConfig = getStatusConfig(ticket.status);
  const isLate = elapsedMinutes > 15;
  const allItemsDone = ticket.items.length > 0 && ticket.items.every((i) => i.status === "done");

  const handleToggleItem = useCallback(
    (item: TicketItem) => {
      const nextStatus = item.status === "done" ? "pending" : "done";
      onItemStatusChange(item.id, nextStatus);
    },
    [onItemStatusChange]
  );

  const handleTicketAction = useCallback(() => {
    if (ticket.status === "pending") {
      onTicketStatusChange(ticket.id, "in_progress");
    } else if (ticket.status === "in_progress" && allItemsDone) {
      onTicketStatusChange(ticket.id, "ready");
    } else if (ticket.status === "ready") {
      onTicketStatusChange(ticket.id, "served");
    }
  }, [ticket.id, ticket.status, allItemsDone, onTicketStatusChange]);

  const actionButton = (() => {
    switch (ticket.status) {
      case "pending":
        return { label: "Commencer", disabled: false };
      case "in_progress":
        return { label: "Pret !", disabled: !allItemsDone };
      case "ready":
        return { label: "Servi", disabled: false };
      default:
        return null;
    }
  })();

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader
        className={cn("-mt-4 rounded-t-xl px-4 py-3", statusConfig.bg, statusConfig.text)}
      >
        <CardTitle className={cn("text-lg font-bold", statusConfig.text)}>
          {ticket.table_number ? `Table ${ticket.table_number}` : "A emporter"}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            {showStationBadge && (
              <Badge
                className="text-xs font-semibold text-white border border-white/30"
                style={{ backgroundColor: ticket.station_color }}
              >
                {ticket.station_name}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-semibold",
                statusConfig.bg,
                statusConfig.text,
                "border border-white/30"
              )}
            >
              {statusConfig.label}
            </Badge>
          </div>
        </CardAction>

        <div
          className={cn(
            "col-span-full flex items-center gap-1.5 text-sm font-medium",
            isLate ? "text-white" : statusConfig.text
          )}
        >
          {isLate ? (
            <AlertTriangle className="size-4 animate-pulse" />
          ) : (
            <Clock className="size-4" />
          )}
          <span className={cn(isLate && "font-bold")}>
            {formatElapsed(elapsedMinutes)}
          </span>
          {isLate && (
            <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold">
              RETARD
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-1 py-3">
        {ticket.items.map((item) => {
          const isDone = item.status === "done";
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-2 rounded-lg px-2 py-1.5 transition-opacity",
                isDone && "opacity-50"
              )}
            >
              <Button
                variant={isDone ? "default" : "outline"}
                size="icon"
                className="mt-0.5 min-h-[44px] min-w-[44px] shrink-0"
                onClick={() => handleToggleItem(item)}
                aria-label={
                  isDone
                    ? `Marquer ${item.product_name} comme non fait`
                    : `Marquer ${item.product_name} comme fait`
                }
              >
                {isDone && <Check className="size-5" />}
              </Button>
              <div className="flex-1">
                <span className={cn("text-base font-medium", isDone && "line-through")}>
                  {item.quantity} &times; {item.product_name}
                </span>
                {item.notes && (
                  <p className="mt-0.5 text-sm italic text-muted-foreground">
                    {item.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      {ticket.order_notes && (
        <CardContent className="border-t pt-2 pb-0">
          <p className="text-sm italic text-muted-foreground">
            Note : {ticket.order_notes}
          </p>
        </CardContent>
      )}

      {actionButton && (
        <CardFooter>
          <Button
            className="min-h-[44px] w-full text-base font-semibold"
            size="lg"
            disabled={actionButton.disabled}
            onClick={handleTicketAction}
          >
            {actionButton.label}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Update KitchenBoard to accept tickets**

Replace the entire content of `src/components/modules/commandes/kitchen-board.tsx` with:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KitchenTicket, type TicketData } from "./kitchen-ticket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KitchenBoardProps {
  tickets: TicketData[];
  onItemStatusChange: (itemId: string, status: string) => void;
  onTicketStatusChange: (ticketId: string, status: string) => void;
  showStationBadge?: boolean;
}

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

const COLUMNS = [
  {
    key: "pending" as const,
    title: "Nouvelles",
    headerBg: "bg-red-500",
    headerText: "text-white",
    badgeBg: "bg-red-600",
  },
  {
    key: "in_progress" as const,
    title: "En preparation",
    headerBg: "bg-amber-500",
    headerText: "text-white",
    badgeBg: "bg-amber-600",
  },
  {
    key: "ready" as const,
    title: "Pretes",
    headerBg: "bg-green-500",
    headerText: "text-white",
    badgeBg: "bg-green-600",
  },
] as const;

// ---------------------------------------------------------------------------
// Pulse hook
// ---------------------------------------------------------------------------

function useNewTicketIds(tickets: TicketData[]): Set<string> {
  const previousIdsRef = useRef<Set<string>>(new Set());
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(tickets.map((t) => t.id));
    const newIds = new Set<string>();

    currentIds.forEach((id) => {
      if (!previousIdsRef.current.has(id)) {
        newIds.add(id);
      }
    });

    previousIdsRef.current = currentIds;

    if (newIds.size > 0) {
      setPulsingIds(newIds);
      const timeout = setTimeout(() => setPulsingIds(new Set()), 3_000);
      return () => clearTimeout(timeout);
    }
  }, [tickets]);

  return pulsingIds;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KitchenBoard({
  tickets,
  onItemStatusChange,
  onTicketStatusChange,
  showStationBadge = false,
}: KitchenBoardProps) {
  const pulsingIds = useNewTicketIds(tickets);

  const grouped = {
    pending: tickets.filter((t) => t.status === "pending"),
    in_progress: tickets.filter((t) => t.status === "in_progress"),
    ready: tickets.filter((t) => t.status === "ready"),
  };

  return (
    <div className="flex h-full w-full gap-4 overflow-x-auto p-4">
      {COLUMNS.map((col) => {
        const columnTickets = grouped[col.key];
        return (
          <div
            key={col.key}
            className="flex min-w-[340px] flex-1 flex-col overflow-hidden rounded-xl bg-muted/30 ring-1 ring-foreground/5"
          >
            <div
              className={cn(
                "flex items-center justify-between px-4 py-3",
                col.headerBg,
                col.headerText
              )}
            >
              <h2 className="text-lg font-bold">{col.title}</h2>
              <Badge
                className={cn(
                  "min-w-[28px] justify-center text-sm font-bold",
                  col.badgeBg,
                  col.headerText,
                  "border border-white/30"
                )}
              >
                {columnTickets.length}
              </Badge>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-3 p-3">
                {columnTickets.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Aucune commande
                  </p>
                ) : (
                  columnTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={cn(
                        "rounded-xl transition-shadow",
                        pulsingIds.has(ticket.id) &&
                          "animate-pulse ring-2 ring-red-400 shadow-lg shadow-red-400/25"
                      )}
                    >
                      <KitchenTicket
                        ticket={ticket}
                        onItemStatusChange={onItemStatusChange}
                        onTicketStatusChange={onTicketStatusChange}
                        showStationBadge={showStationBadge}
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Update cuisine page with station filtering and supervisor tabs**

Replace the entire content of `src/app/(dashboard)/commandes/cuisine/page.tsx` with:

```typescript
"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KitchenBoard } from "@/components/modules/commandes/kitchen-board";
import {
  getPreparationTickets,
  updatePreparationTicketStatus,
  updateOrderItemStatus,
} from "../actions";
import { getActiveStations } from "../../admin-operationnelle/actions";
import type { PreparationTicketWithItems } from "../actions";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

function CuisineContent() {
  const searchParams = useSearchParams();
  const stationParam = searchParams.get("station");

  const [tickets, setTickets] = useState<PreparationTicketWithItems[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(stationParam);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [ticketsData, stationsData] = await Promise.all([
        getPreparationTickets(activeTab ?? undefined),
        getActiveStations(),
      ]);
      setTickets(ticketsData);
      setStations(stationsData);
    } catch (error) {
      console.error("Erreur chargement KDS:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleItemStatusChange(itemId: string, status: string) {
    await updateOrderItemStatus(itemId, status as never);
    await fetchData();
  }

  async function handleTicketStatusChange(ticketId: string, status: string) {
    await updatePreparationTicketStatus(ticketId, status as never);
    await fetchData();
  }

  // Find current station for header
  const currentStation = activeTab
    ? stations.find((s) => s.id === activeTab)
    : null;

  const isSupervisor = !stationParam;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          render={<Link href="/commandes" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {currentStation ? currentStation.name : "Ecran cuisine"}
          </h1>
          <p className="text-muted-foreground">
            {tickets.length} ticket{tickets.length > 1 ? "s" : ""} actif
            {tickets.length > 1 ? "s" : ""}
          </p>
        </div>
        {isSupervisor && (
          <Button
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            render={<Link href="/commandes/cuisine/setup" />}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Station tabs (supervisor mode only) */}
      {isSupervisor && stations.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={activeTab === null ? "default" : "outline"}
            className="min-h-11 shrink-0"
            onClick={() => setActiveTab(null)}
          >
            Tous
          </Button>
          {stations.map((station) => (
            <Button
              key={station.id}
              variant={activeTab === station.id ? "default" : "outline"}
              className="min-h-11 shrink-0 gap-2"
              onClick={() => setActiveTab(station.id)}
            >
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: station.color ?? "#6B7280" }}
              />
              {station.name}
            </Button>
          ))}
        </div>
      )}

      {/* Station color bar (dedicated mode) */}
      {currentStation && (
        <div
          className="h-1.5 rounded-full"
          style={{ backgroundColor: currentStation.color ?? "#6B7280" }}
        />
      )}

      {/* KDS Board */}
      <KitchenBoard
        tickets={tickets}
        onItemStatusChange={handleItemStatusChange}
        onTicketStatusChange={handleTicketStatusChange}
        showStationBadge={activeTab === null}
      />
    </div>
  );
}

export default function CuisinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <CuisineContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/commandes/cuisine/page.tsx src/components/modules/commandes/kitchen-board.tsx src/components/modules/commandes/kitchen-ticket.tsx
git commit -m "feat(kds): refactor KDS to use preparation tickets with station filtering"
```

---

## Task 7: Tablet Station Setup Page

**Files:**
- Create: `src/app/(dashboard)/commandes/cuisine/setup/page.tsx`

- [ ] **Step 1: Create the setup page**

```typescript
// src/app/(dashboard)/commandes/cuisine/setup/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Monitor } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveStations } from "../../../admin-operationnelle/actions";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

const STORAGE_KEY = "resto360_kds_station";

export default function CuisineSetupPage() {
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStationId, setCurrentStationId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setCurrentStationId(stored);

    getActiveStations()
      .then(setStations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function selectStation(stationId: string) {
    localStorage.setItem(STORAGE_KEY, stationId);
    router.push(`/commandes/cuisine?station=${stationId}`);
  }

  function clearStation() {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStationId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          render={<Link href="/commandes/cuisine" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Configuration tablette
          </h1>
          <p className="text-muted-foreground">
            Choisissez le poste pour cet ecran
          </p>
        </div>
      </div>

      {currentStationId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Poste actuel : {stations.find((s) => s.id === currentStationId)?.name ?? "Inconnu"}
          <Button
            variant="link"
            className="ml-2 h-auto p-0 text-amber-800 underline"
            onClick={clearStation}
          >
            Reinitialiser
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        {stations.map((station) => (
          <Card
            key={station.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => selectStation(station.id)}
          >
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div
                className="size-5 rounded-full"
                style={{ backgroundColor: station.color ?? "#6B7280" }}
              />
              <CardTitle className="text-lg">{station.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <Monitor className="h-4 w-4" />
              Afficher uniquement les tickets de ce poste
            </CardContent>
          </Card>
        ))}

        <Card
          className="cursor-pointer border-dashed transition-shadow hover:shadow-md"
          onClick={() => router.push("/commandes/cuisine")}
        >
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">
              Vue superviseur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Voir tous les postes avec onglets de filtrage
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/commandes/cuisine/setup/
git commit -m "feat(kds): add tablet station setup page"
```

---

## Task 8: Product Form Station Select & Category Station

**Files:**
- Modify: `src/components/modules/carte/product-form.tsx`
- Modify: `src/app/(dashboard)/carte/actions.ts`

- [ ] **Step 1: Add station field to product form**

In `src/components/modules/carte/product-form.tsx`:

Add to `ProductFormData` interface:
```typescript
export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  cost_price: number | null;
  category_id: string;
  allergens: string[];
  is_available: boolean;
  station_id: string | null; // NEW
}
```

Add to props interface:
```typescript
interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: MenuCategory[];
  defaultCategoryId?: string;
  onSubmit: (data: ProductFormData) => void;
  loading?: boolean;
  stations?: Tables<"preparation_stations">[]; // NEW
}
```

Add import at top:
```typescript
import type { Tables } from "@/types/database.types";
```

Add state inside the component:
```typescript
const [stationId, setStationId] = useState<string>("");
```

In the `useEffect`, add for editing:
```typescript
setStationId(product.station_id ?? "");
```
And for new product:
```typescript
setStationId("");
```

In `handleSubmit`, add `station_id`:
```typescript
onSubmit({
  name,
  description,
  price: parseFloat(price) || 0,
  cost_price: costPrice ? parseFloat(costPrice) : null,
  category_id: categoryId,
  allergens,
  is_available: isAvailable,
  station_id: stationId || null, // NEW
});
```

Add this JSX block after the category select and before the price grid:
```tsx
{stations && stations.length > 0 && (
  <div className="space-y-2">
    <Label htmlFor="product-station">Poste de preparation</Label>
    <Select value={stationId} onValueChange={(v) => setStationId(v === "none" ? "" : v)}>
      <SelectTrigger id="product-station">
        <SelectValue placeholder="Poste de la categorie" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Poste de la categorie</SelectItem>
        {stations.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: s.color ?? "#6B7280" }}
              />
              {s.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">
      Laissez vide pour utiliser le poste de la categorie
    </p>
  </div>
)}
```

- [ ] **Step 2: Add updateCategoryStation to carte actions**

In `src/app/(dashboard)/carte/actions.ts`, add this function after the existing `updateCategory`:

```typescript
export async function updateCategoryStation(
  id: string,
  stationId: string | null
): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("menu_categories")
    .update({ default_station_id: stationId })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(`Erreur mise a jour du poste categorie : ${error.message}`);
  }
}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/modules/carte/product-form.tsx src/app/\(dashboard\)/carte/actions.ts
git commit -m "feat(carte): add station field to product form and category station action"
```

---

## Task 9: Floor Plan Station Badges

**Files:**
- Modify: `src/components/modules/commandes/floor-plan.tsx`
- Modify: `src/components/modules/commandes/table-card.tsx`
- Modify: `src/app/(dashboard)/commandes/page.tsx`

- [ ] **Step 1: Add station badges to FloorPlanTable type**

In `src/components/modules/commandes/floor-plan.tsx`, update the `FloorPlanTable` interface:

```typescript
interface StationBadge {
  station_name: string;
  station_color: string;
  status: string; // pending | in_progress | ready | served
}

interface FloorPlanTable {
  tableNumber: string;
  status: TableStatus;
  orderTotal?: number;
  guestCount?: number;
  orderCreatedAt?: string;
  stationBadges?: StationBadge[]; // NEW
}
```

Export the `StationBadge` type at the bottom:
```typescript
export type { FloorPlanProps, FloorPlanTable, StationBadge };
```

- [ ] **Step 2: Update TableCard to show station badges**

In `src/components/modules/commandes/table-card.tsx`:

Add `stationBadges` to the `TableCardProps` interface:
```typescript
interface TableCardProps {
  tableNumber: string;
  status: TableStatus;
  orderTotal?: number;
  guestCount?: number;
  elapsedMinutes?: number;
  onClick: () => void;
  isSelected?: boolean;
  stationBadges?: { station_name: string; station_color: string; status: string }[];
}
```

Add `stationBadges` to the destructured props:
```typescript
export function TableCard({
  tableNumber,
  status,
  orderTotal,
  guestCount,
  elapsedMinutes,
  onClick,
  isSelected = false,
  stationBadges,
}: TableCardProps) {
```

Add this JSX inside the `{status !== "free" && (` block, after the `elapsedMinutes` span and before the closing `</div>`:
```tsx
{stationBadges && stationBadges.length > 0 && (
  <div className="flex gap-1 mt-1">
    {stationBadges.map((badge) => (
      <span
        key={badge.station_name}
        className={cn(
          "size-2.5 rounded-full",
          badge.status === "ready" && "ring-2 ring-green-400",
          badge.status === "in_progress" && "animate-pulse"
        )}
        style={{ backgroundColor: badge.station_color }}
        title={`${badge.station_name}: ${badge.status}`}
      />
    ))}
  </div>
)}
```

In `src/components/modules/commandes/floor-plan.tsx`, pass `stationBadges` through to `TableCard`:
```tsx
<TableCard
  key={table.tableNumber}
  tableNumber={table.tableNumber}
  status={table.status}
  orderTotal={table.orderTotal}
  guestCount={table.guestCount}
  elapsedMinutes={
    table.orderCreatedAt
      ? computeElapsedMinutes(table.orderCreatedAt)
      : undefined
  }
  onClick={() => onSelectTable(table.tableNumber)}
  isSelected={selectedTable === table.tableNumber}
  stationBadges={table.stationBadges}
/>
```

- [ ] **Step 3: Feed station badges from commandes page**

In `src/app/(dashboard)/commandes/page.tsx`, add imports and data fetching for preparation tickets:

Add import:
```typescript
import { getPreparationTickets } from "./actions";
import type { PreparationTicketWithItems } from "./actions";
```

Add state:
```typescript
const [prepTickets, setPrepTickets] = useState<PreparationTicketWithItems[]>([]);
```

In `fetchData`, add to the Promise.all:
```typescript
const [ordersData, statsData, ticketsData] = await Promise.all([
  getActiveOrders(),
  getOrderStats(today),
  getPreparationTickets(),
]);
setPrepTickets(ticketsData);
```

Update `getTableStatus` to include station badges:
```typescript
function getTableStatus(orders: OrderWithItems[], tableNumber: string, tickets: PreparationTicketWithItems[]) {
  const order = orders.find(
    (o) => o.table_number === tableNumber && !["paid", "cancelled"].includes(o.status ?? "")
  );
  if (!order) return { status: "free" as const };

  const statusMap: Record<string, "occupied" | "waiting" | "ready"> = {
    pending: "occupied",
    in_progress: "waiting",
    ready: "ready",
    served: "occupied",
  };

  // Gather station badges for this order
  const orderTickets = tickets.filter((t) => t.order_id === order.id);
  const stationBadges = orderTickets
    .filter((t) => t.status !== "served")
    .map((t) => ({
      station_name: t.station_name,
      station_color: t.station_color,
      status: t.status,
    }));

  return {
    status: statusMap[order.status ?? ""] ?? ("occupied" as const),
    orderTotal: order.total ?? undefined,
    orderCreatedAt: order.created_at ?? undefined,
    guestCount: order.order_items.length,
    stationBadges,
  };
}
```

Update the `tables` mapping to pass `prepTickets`:
```typescript
const tables = RESTAURANT_TABLES.map((t) => ({
  tableNumber: t,
  ...getTableStatus(orders, t, prepTickets),
}));
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/modules/commandes/floor-plan.tsx src/components/modules/commandes/table-card.tsx src/app/\(dashboard\)/commandes/page.tsx
git commit -m "feat(commandes): add station status badges to floor plan"
```

---

## Task 10: Browser Notifications

**Files:**
- Modify: `src/app/(dashboard)/commandes/page.tsx`
- Modify: `src/app/(dashboard)/commandes/cuisine/page.tsx`

- [ ] **Step 1: Add notification hook**

Create a reusable hook at the top of `src/app/(dashboard)/commandes/page.tsx` (or extract to a shared file later):

```typescript
function useTicketReadyNotifications(tickets: PreparationTicketWithItems[]) {
  const previousReadyRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || Notification.permission === "denied") return;

    const currentReady = new Set(
      tickets.filter((t) => t.status === "ready").map((t) => t.id)
    );

    // Detect newly ready tickets
    const newlyReady = [...currentReady].filter(
      (id) => !previousReadyRef.current.has(id)
    );

    previousReadyRef.current = currentReady;

    // Skip on first render (all are "new")
    if (newlyReady.length === 0) return;

    for (const ticketId of newlyReady) {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) continue;

      const title = ticket.table_number
        ? `Table ${ticket.table_number}`
        : "A emporter";

      if (Notification.permission === "granted") {
        new Notification(`${title} — ${ticket.station_name} pret`, {
          body: `${ticket.items.length} article(s) a recuperer`,
          tag: ticketId,
        });
      }
    }
  }, [tickets]);
}
```

Add `useRef` to imports.

- [ ] **Step 2: Request notification permission**

In the commandes page, add a permission request on mount:

```typescript
useEffect(() => {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}, []);
```

- [ ] **Step 3: Wire up the hook**

Call `useTicketReadyNotifications(prepTickets)` in the `CommandesPage` component.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/commandes/page.tsx
git commit -m "feat(commandes): add browser notifications for ready tickets"
```

---

## Task 11: Final Integration Verification

- [ ] **Step 1: Full build check**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: TypeScript strict check**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npx tsc --noEmit`
Expected: No new errors introduced by our changes.

- [ ] **Step 3: Verify all new routes**

Check these routes compile:
- `/admin-operationnelle` — station management
- `/commandes/cuisine` — supervisor KDS with tabs
- `/commandes/cuisine?station=xxx` — dedicated station KDS
- `/commandes/cuisine/setup` — tablet setup

- [ ] **Step 4: Final commit with all remaining changes**

```bash
git add -A
git status
git commit -m "feat(preparation-stations): complete preparation stations and ticket splitting system"
```
