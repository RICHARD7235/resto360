# M06 Fournisseurs + M05 Stock & Achats — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement supplier management (M06) and stock & purchasing (M05) modules for Resto360, enabling Pascal to track inventory, manage suppliers with catalogs, create purchase orders with auto-suggestions, and import inventory from Excel.

**Architecture:** M06 Fournisseurs first (foundation), then M05 Stock & Achats which depends on it. Both follow existing patterns: server actions for data, Zustand for UI state, shadcn/ui components. Import uses client-side SheetJS parsing with server-side validation.

**Tech Stack:** Next.js 16, Supabase (PostgreSQL + RLS), shadcn/ui v4 (render prop), Zustand 5, SheetJS (xlsx), TypeScript strict

---

## File Structure

### M06 Fournisseurs
```
supabase/migrations/20260406_suppliers.sql                    — DB tables + RLS
src/app/(dashboard)/fournisseurs/actions.ts                   — Server actions
src/app/(dashboard)/fournisseurs/page.tsx                     — Main list page (replaces stub)
src/app/(dashboard)/fournisseurs/[id]/page.tsx                — Supplier detail + catalog
src/stores/fournisseurs.store.ts                              — UI state
src/components/modules/fournisseurs/supplier-form.tsx          — Create/edit dialog
src/components/modules/fournisseurs/catalog-item-form.tsx      — Catalog item dialog
src/components/modules/fournisseurs/supplier-card.tsx          — Card for list view
```

### M05 Stock & Achats
```
supabase/migrations/20260406_stock_achats.sql                 — DB tables + RLS + recipe_ingredients enrichment
src/app/(dashboard)/stock/actions.ts                          — Server actions (stock + movements + purchase orders)
src/app/(dashboard)/stock/page.tsx                            — Main tabbed page (replaces stub)
src/app/(dashboard)/stock/inventaire/page.tsx                 — Inventory count page
src/app/(dashboard)/stock/commande/nouvelle/page.tsx          — New purchase order
src/app/(dashboard)/stock/commande/[id]/page.tsx              — Purchase order detail + receiving
src/stores/stock.store.ts                                     — UI state
src/components/modules/stock/stock-item-form.tsx               — Create/edit stock item dialog
src/components/modules/stock/movement-form.tsx                 — Manual movement dialog
src/components/modules/stock/inventory-import-dialog.tsx       — Multi-step Excel import
src/components/modules/stock/purchase-order-form.tsx           — PO creation form component
src/lib/inventory-import.ts                                   — SheetJS parsing + column detection utils
```

---

## Task 1: M06 Database Migration

**Files:**
- Create: `supabase/migrations/20260406_suppliers.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migration: Suppliers & Catalog
-- Date: 2026-04-06
-- Description: Add suppliers and supplier catalog items tables for M06

-- 1. Create suppliers table
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create supplier_catalog_items table
CREATE TABLE supplier_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  reference text,
  label text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('kg', 'L', 'piece', 'pack')),
  unit_price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  category text CHECK (category IN ('viandes', 'poissons', 'légumes', 'produits_laitiers', 'boissons', 'épicerie', 'autre')),
  is_available boolean NOT NULL DEFAULT true,
  last_price_update timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_suppliers_restaurant ON suppliers(restaurant_id);
CREATE INDEX idx_suppliers_active ON suppliers(restaurant_id, is_active);
CREATE INDEX idx_catalog_items_supplier ON supplier_catalog_items(supplier_id);

-- 4. RLS policies for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers of their restaurant"
  ON suppliers FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can insert suppliers for their restaurant"
  ON suppliers FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can update suppliers of their restaurant"
  ON suppliers FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can delete suppliers of their restaurant"
  ON suppliers FOR DELETE
  USING (restaurant_id = get_user_restaurant_id());

-- 5. RLS policies for supplier_catalog_items
ALTER TABLE supplier_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view catalog items of their suppliers"
  ON supplier_catalog_items FOR SELECT
  USING (supplier_id IN (SELECT id FROM suppliers WHERE restaurant_id = get_user_restaurant_id()));

CREATE POLICY "Users can insert catalog items for their suppliers"
  ON supplier_catalog_items FOR INSERT
  WITH CHECK (supplier_id IN (SELECT id FROM suppliers WHERE restaurant_id = get_user_restaurant_id()));

CREATE POLICY "Users can update catalog items of their suppliers"
  ON supplier_catalog_items FOR UPDATE
  USING (supplier_id IN (SELECT id FROM suppliers WHERE restaurant_id = get_user_restaurant_id()));

CREATE POLICY "Users can delete catalog items of their suppliers"
  ON supplier_catalog_items FOR DELETE
  USING (supplier_id IN (SELECT id FROM suppliers WHERE restaurant_id = get_user_restaurant_id()));
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run the migration using the Supabase MCP `apply_migration` tool with the SQL above.

- [ ] **Step 3: Regenerate TypeScript types**

```bash
cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360
npx supabase gen types typescript --project-id vymwkwziytcetjlvtbcc > src/types/database.types.ts
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260406_suppliers.sql src/types/database.types.ts
git commit -m "feat(m06): add suppliers and catalog tables with RLS"
```

---

## Task 2: M06 Server Actions

**Files:**
- Create: `src/app/(dashboard)/fournisseurs/actions.ts`

- [ ] **Step 1: Create the server actions file**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Tables, Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SupplierRow = Tables<"suppliers">;
type SupplierInsert = Database["public"]["Tables"]["suppliers"]["Insert"];
type SupplierUpdate = Database["public"]["Tables"]["suppliers"]["Update"];
type CatalogItemRow = Tables<"supplier_catalog_items">;
type CatalogItemInsert = Database["public"]["Tables"]["supplier_catalog_items"]["Insert"];
type CatalogItemUpdate = Database["public"]["Tables"]["supplier_catalog_items"]["Update"];

export type SupplierCategory =
  | "viandes"
  | "poissons"
  | "légumes"
  | "produits_laitiers"
  | "boissons"
  | "épicerie"
  | "autre";

export interface SupplierFilters {
  isActive?: boolean;
  search?: string;
}

export interface SupplierWithCatalogCount extends SupplierRow {
  catalog_count: number;
}

export interface SupplierStats {
  total: number;
  active: number;
  totalCatalogItems: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    throw new Error("Aucun restaurant associé à votre compte.");
  }
  return profile.restaurant_id;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getSuppliers(
  filters: SupplierFilters = {}
): Promise<SupplierWithCatalogCount[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("suppliers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (filters.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive);
  }
  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data: suppliers, error } = await query;
  if (error) throw new Error("Impossible de charger les fournisseurs.");

  // Get catalog counts per supplier
  const supplierIds = (suppliers || []).map((s) => s.id);
  let catalogCounts: Record<string, number> = {};

  if (supplierIds.length > 0) {
    const { data: items } = await supabase
      .from("supplier_catalog_items")
      .select("supplier_id")
      .in("supplier_id", supplierIds);

    if (items) {
      for (const item of items) {
        catalogCounts[item.supplier_id] = (catalogCounts[item.supplier_id] || 0) + 1;
      }
    }
  }

  return (suppliers || []).map((s) => ({
    ...s,
    catalog_count: catalogCounts[s.id] || 0,
  }));
}

export async function getSupplier(
  id: string
): Promise<{ supplier: SupplierRow; catalogItems: CatalogItemRow[] }> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (error || !supplier) throw new Error("Fournisseur introuvable.");

  const { data: catalogItems } = await supabase
    .from("supplier_catalog_items")
    .select("*")
    .eq("supplier_id", id)
    .order("category", { ascending: true })
    .order("label", { ascending: true });

  return { supplier, catalogItems: catalogItems || [] };
}

export async function getSupplierStats(): Promise<SupplierStats> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, is_active")
    .eq("restaurant_id", restaurantId);

  const all = suppliers || [];
  const supplierIds = all.map((s) => s.id);

  let totalCatalogItems = 0;
  if (supplierIds.length > 0) {
    const { count } = await supabase
      .from("supplier_catalog_items")
      .select("id", { count: "exact", head: true })
      .in("supplier_id", supplierIds);
    totalCatalogItems = count || 0;
  }

  return {
    total: all.length,
    active: all.filter((s) => s.is_active).length,
    totalCatalogItems,
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createSupplier(
  data: Omit<SupplierInsert, "id" | "restaurant_id" | "created_at" | "updated_at">
): Promise<SupplierRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .insert({ ...data, restaurant_id: restaurantId })
    .select()
    .single();

  if (error) throw new Error("Impossible de créer le fournisseur.");
  return supplier;
}

export async function updateSupplier(
  id: string,
  data: Omit<SupplierUpdate, "id" | "restaurant_id" | "created_at">
): Promise<SupplierRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error("Impossible de modifier le fournisseur.");
  return supplier;
}

export async function toggleSupplierActive(id: string): Promise<SupplierRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("suppliers")
    .select("is_active")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!current) throw new Error("Fournisseur introuvable.");

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .update({ is_active: !current.is_active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error("Impossible de modifier le statut.");
  return supplier;
}

export async function createCatalogItem(
  supplierId: string,
  data: Omit<CatalogItemInsert, "id" | "supplier_id" | "created_at" | "updated_at">
): Promise<CatalogItemRow> {
  await getUserRestaurantId(); // Auth check
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("supplier_catalog_items")
    .insert({ ...data, supplier_id: supplierId })
    .select()
    .single();

  if (error) throw new Error("Impossible d'ajouter l'article au catalogue.");
  return item;
}

export async function updateCatalogItem(
  id: string,
  data: Omit<CatalogItemUpdate, "id" | "supplier_id" | "created_at">
): Promise<CatalogItemRow> {
  await getUserRestaurantId(); // Auth check
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("supplier_catalog_items")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error("Impossible de modifier l'article.");
  return item;
}

export async function deleteCatalogItem(id: string): Promise<void> {
  await getUserRestaurantId(); // Auth check
  const supabase = await createClient();

  const { error } = await supabase
    .from("supplier_catalog_items")
    .delete()
    .eq("id", id);

  if (error) throw new Error("Impossible de supprimer l'article.");
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/fournisseurs/actions.ts
git commit -m "feat(m06): add supplier server actions (CRUD + catalog)"
```

---

## Task 3: M06 Zustand Store

**Files:**
- Create: `src/stores/fournisseurs.store.ts`

- [ ] **Step 1: Create the store**

```typescript
import { create } from "zustand";

interface FournisseursState {
  searchQuery: string;
  showInactive: boolean;
  supplierFormOpen: boolean;
  selectedSupplierId: string | null;
  catalogItemFormOpen: boolean;
  selectedCatalogItemId: string | null;
  setSearchQuery: (query: string) => void;
  setShowInactive: (show: boolean) => void;
  setSupplierFormOpen: (open: boolean) => void;
  setSelectedSupplierId: (id: string | null) => void;
  setCatalogItemFormOpen: (open: boolean) => void;
  setSelectedCatalogItemId: (id: string | null) => void;
}

export const useFournisseursStore = create<FournisseursState>((set) => ({
  searchQuery: "",
  showInactive: false,
  supplierFormOpen: false,
  selectedSupplierId: null,
  catalogItemFormOpen: false,
  selectedCatalogItemId: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowInactive: (show) => set({ showInactive: show }),
  setSupplierFormOpen: (open) => set({ supplierFormOpen: open }),
  setSelectedSupplierId: (id) => set({ selectedSupplierId: id }),
  setCatalogItemFormOpen: (open) => set({ catalogItemFormOpen: open }),
  setSelectedCatalogItemId: (id) => set({ selectedCatalogItemId: id }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/fournisseurs.store.ts
git commit -m "feat(m06): add fournisseurs Zustand store"
```

---

## Task 4: M06 Supplier Form Component

**Files:**
- Create: `src/components/modules/fournisseurs/supplier-form.tsx`

- [ ] **Step 1: Create the supplier form dialog**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/types/database.types";

type Supplier = Tables<"suppliers">;

export interface SupplierFormData {
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSubmit: (data: SupplierFormData) => Promise<void>;
}

const emptyForm: SupplierFormData = {
  name: "",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export function SupplierForm({
  open,
  onOpenChange,
  supplier,
  onSubmit,
}: SupplierFormProps) {
  const [form, setForm] = useState<SupplierFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEditing = !!supplier;

  useEffect(() => {
    if (open) {
      setForm(
        supplier
          ? {
              name: supplier.name,
              contact_name: supplier.contact_name || "",
              phone: supplier.phone || "",
              email: supplier.email || "",
              address: supplier.address || "",
              notes: supplier.notes || "",
            }
          : emptyForm
      );
    }
  }, [open, supplier]);

  function updateField<K extends keyof SupplierFormData>(
    key: K,
    value: SupplierFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le fournisseur" : "Nouveau fournisseur"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => updateField("contact_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (conditions, jours de livraison...)</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "Enregistrement..." : isEditing ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/fournisseurs/supplier-form.tsx
git commit -m "feat(m06): add supplier form dialog component"
```

---

## Task 5: M06 Catalog Item Form Component

**Files:**
- Create: `src/components/modules/fournisseurs/catalog-item-form.tsx`

- [ ] **Step 1: Create the catalog item form dialog**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/types/database.types";

type CatalogItem = Tables<"supplier_catalog_items">;

export interface CatalogItemFormData {
  label: string;
  reference: string;
  unit: string;
  unit_price: number;
  category: string;
  is_available: boolean;
}

interface CatalogItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CatalogItem | null;
  onSubmit: (data: CatalogItemFormData) => Promise<void>;
}

const UNITS = [
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "L", label: "Litre (L)" },
  { value: "piece", label: "Pièce" },
  { value: "pack", label: "Pack / Lot" },
];

const CATEGORIES = [
  { value: "viandes", label: "Viandes" },
  { value: "poissons", label: "Poissons" },
  { value: "légumes", label: "Légumes" },
  { value: "produits_laitiers", label: "Produits laitiers" },
  { value: "boissons", label: "Boissons" },
  { value: "épicerie", label: "Épicerie" },
  { value: "autre", label: "Autre" },
];

const emptyForm: CatalogItemFormData = {
  label: "",
  reference: "",
  unit: "kg",
  unit_price: 0,
  category: "autre",
  is_available: true,
};

export function CatalogItemForm({
  open,
  onOpenChange,
  item,
  onSubmit,
}: CatalogItemFormProps) {
  const [form, setForm] = useState<CatalogItemFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEditing = !!item;

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              label: item.label,
              reference: item.reference || "",
              unit: item.unit,
              unit_price: Number(item.unit_price),
              category: item.category || "autre",
              is_available: item.is_available,
            }
          : emptyForm
      );
    }
  }, [open, item]);

  function updateField<K extends keyof CatalogItemFormData>(
    key: K,
    value: CatalogItemFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'article" : "Nouvel article catalogue"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Désignation *</Label>
            <Input
              id="label"
              value={form.label}
              onChange={(e) => updateField("label", e.target.value)}
              placeholder="Entrecôte Black Angus 300g"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Référence fournisseur</Label>
            <Input
              id="reference"
              value={form.reference}
              onChange={(e) => updateField("reference", e.target.value)}
              placeholder="REF-001"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unité *</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => updateField("unit", v)}
              >
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Prix unitaire HT (€) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0"
                value={form.unit_price}
                onChange={(e) => updateField("unit_price", parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select
              value={form.category}
              onValueChange={(v) => updateField("category", v)}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !form.label.trim()}>
              {saving ? "Enregistrement..." : isEditing ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/fournisseurs/catalog-item-form.tsx
git commit -m "feat(m06): add catalog item form dialog component"
```

---

## Task 6: M06 Supplier Card Component

**Files:**
- Create: `src/components/modules/fournisseurs/supplier-card.tsx`

- [ ] **Step 1: Create the supplier card**

```typescript
"use client";

import { Phone, Mail, Package, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupplierWithCatalogCount } from "@/app/(dashboard)/fournisseurs/actions";

interface SupplierCardProps {
  supplier: SupplierWithCatalogCount;
  onClick: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}

export function SupplierCard({
  supplier,
  onClick,
  onEdit,
  onToggleActive,
}: SupplierCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{supplier.name}</h3>
              {!supplier.is_active && (
                <Badge variant="secondary">Inactif</Badge>
              )}
            </div>
            {supplier.contact_name && (
              <p className="text-sm text-muted-foreground">
                {supplier.contact_name}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} />
              }
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleActive();
                }}
              >
                {supplier.is_active ? "Désactiver" : "Réactiver"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          {supplier.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {supplier.phone}
            </span>
          )}
          {supplier.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {supplier.email}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {supplier.catalog_count} article{supplier.catalog_count > 1 ? "s" : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/fournisseurs/supplier-card.tsx
git commit -m "feat(m06): add supplier card component"
```

---

## Task 7: M06 Fournisseurs List Page

**Files:**
- Modify: `src/app/(dashboard)/fournisseurs/page.tsx` (replace stub)

- [ ] **Step 1: Replace the stub page with the full implementation**

Replace the entire content of `src/app/(dashboard)/fournisseurs/page.tsx` with:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Truck, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFournisseursStore } from "@/stores/fournisseurs.store";
import { SupplierCard } from "@/components/modules/fournisseurs/supplier-card";
import { SupplierForm } from "@/components/modules/fournisseurs/supplier-form";
import type { SupplierFormData } from "@/components/modules/fournisseurs/supplier-form";
import {
  getSuppliers,
  getSupplierStats,
  createSupplier,
  updateSupplier,
  toggleSupplierActive,
} from "./actions";
import type { SupplierWithCatalogCount, SupplierStats } from "./actions";
import type { Tables } from "@/types/database.types";

type Supplier = Tables<"suppliers">;

export default function FournisseursPage() {
  const router = useRouter();
  const {
    searchQuery,
    showInactive,
    supplierFormOpen,
    selectedSupplierId,
    setSearchQuery,
    setShowInactive,
    setSupplierFormOpen,
    setSelectedSupplierId,
  } = useFournisseursStore();

  const [suppliers, setSuppliers] = useState<SupplierWithCatalogCount[]>([]);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [suppliersData, statsData] = await Promise.all([
        getSuppliers({
          isActive: showInactive ? undefined : true,
          search: searchQuery || undefined,
        }),
        getSupplierStats(),
      ]);
      setSuppliers(suppliersData);
      setStats(statsData);
    } catch {
      toast.error("Erreur lors du chargement des fournisseurs");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showInactive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateSupplier(data: SupplierFormData) {
    try {
      await createSupplier(data);
      toast.success("Fournisseur créé");
      loadData();
    } catch {
      toast.error("Erreur lors de la création");
    }
  }

  async function handleUpdateSupplier(data: SupplierFormData) {
    if (!selectedSupplierId) return;
    try {
      await updateSupplier(selectedSupplierId, data);
      toast.success("Fournisseur modifié");
      loadData();
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  async function handleToggleActive(id: string) {
    try {
      await toggleSupplierActive(id);
      toast.success("Statut mis à jour");
      loadData();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  }

  function openEditForm(supplier: SupplierWithCatalogCount) {
    setSelectedSupplierId(supplier.id);
    setEditingSupplier(supplier);
    setSupplierFormOpen(true);
  }

  function openCreateForm() {
    setSelectedSupplierId(null);
    setEditingSupplier(null);
    setSupplierFormOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fournisseurs</h1>
          <p className="text-muted-foreground">
            Gestion des fournisseurs et catalogues produits
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau fournisseur
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Truck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">
                  Fournisseurs ({stats.active} actifs)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalCatalogItems}</p>
                <p className="text-sm text-muted-foreground">Articles catalogue</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un fournisseur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm">
            Voir inactifs
          </Label>
        </div>
      </div>

      {/* Supplier list */}
      {suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24">
          <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold text-muted-foreground">
            Aucun fournisseur
          </h2>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Ajoutez votre premier fournisseur pour commencer.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onClick={() => router.push(`/fournisseurs/${supplier.id}`)}
              onEdit={() => openEditForm(supplier)}
              onToggleActive={() => handleToggleActive(supplier.id)}
            />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <SupplierForm
        open={supplierFormOpen}
        onOpenChange={setSupplierFormOpen}
        supplier={editingSupplier}
        onSubmit={editingSupplier ? handleUpdateSupplier : handleCreateSupplier}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/fournisseurs/page.tsx
git commit -m "feat(m06): implement fournisseurs list page with filters and stats"
```

---

## Task 8: M06 Supplier Detail Page

**Files:**
- Create: `src/app/(dashboard)/fournisseurs/[id]/page.tsx`

- [ ] **Step 1: Create the supplier detail page**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Package,
  Phone,
  Mail,
  MapPin,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SupplierForm } from "@/components/modules/fournisseurs/supplier-form";
import type { SupplierFormData } from "@/components/modules/fournisseurs/supplier-form";
import { CatalogItemForm } from "@/components/modules/fournisseurs/catalog-item-form";
import type { CatalogItemFormData } from "@/components/modules/fournisseurs/catalog-item-form";
import {
  getSupplier,
  updateSupplier,
  toggleSupplierActive,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from "../actions";
import type { Tables } from "@/types/database.types";

type Supplier = Tables<"suppliers">;
type CatalogItem = Tables<"supplier_catalog_items">;

const CATEGORY_LABELS: Record<string, string> = {
  viandes: "Viandes",
  poissons: "Poissons",
  légumes: "Légumes",
  produits_laitiers: "Produits laitiers",
  boissons: "Boissons",
  épicerie: "Épicerie",
  autre: "Autre",
};

const UNIT_LABELS: Record<string, string> = {
  kg: "kg",
  L: "L",
  piece: "pièce",
  pack: "pack",
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [catalogFormOpen, setCatalogFormOpen] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<CatalogItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getSupplier(supplierId);
      setSupplier(data.supplier);
      setCatalogItems(data.catalogItems);
    } catch {
      toast.error("Fournisseur introuvable");
      router.push("/fournisseurs");
    } finally {
      setLoading(false);
    }
  }, [supplierId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpdateSupplier(data: SupplierFormData) {
    try {
      await updateSupplier(supplierId, data);
      toast.success("Fournisseur modifié");
      loadData();
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  async function handleToggleActive() {
    try {
      await toggleSupplierActive(supplierId);
      toast.success("Statut mis à jour");
      loadData();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  }

  async function handleCreateCatalogItem(data: CatalogItemFormData) {
    try {
      await createCatalogItem(supplierId, data);
      toast.success("Article ajouté au catalogue");
      loadData();
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  }

  async function handleUpdateCatalogItem(data: CatalogItemFormData) {
    if (!editingCatalogItem) return;
    try {
      await updateCatalogItem(editingCatalogItem.id, data);
      toast.success("Article modifié");
      loadData();
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  async function handleDeleteCatalogItem(id: string) {
    try {
      await deleteCatalogItem(id);
      toast.success("Article supprimé");
      loadData();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  if (loading || !supplier) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/fournisseurs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
            {!supplier.is_active && <Badge variant="secondary">Inactif</Badge>}
          </div>
          {supplier.contact_name && (
            <p className="text-muted-foreground">{supplier.contact_name}</p>
          )}
        </div>
        <Button variant="outline" onClick={handleToggleActive}>
          {supplier.is_active ? "Désactiver" : "Réactiver"}
        </Button>
        <Button variant="outline" onClick={() => setEditFormOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Modifier
        </Button>
        <Button onClick={() => router.push(`/stock/commande/nouvelle?supplier=${supplierId}`)}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Nouveau bon de commande
        </Button>
      </div>

      {/* Contact info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            {supplier.phone && (
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {supplier.phone}
              </span>
            )}
            {supplier.email && (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {supplier.email}
              </span>
            )}
            {supplier.address && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {supplier.address}
              </span>
            )}
          </div>
          {supplier.notes && (
            <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
              {supplier.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Catalog */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catalogue ({catalogItems.length} article{catalogItems.length > 1 ? "s" : ""})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingCatalogItem(null);
              setCatalogFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un article
          </Button>
        </CardHeader>
        <CardContent>
          {catalogItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun article dans le catalogue. Ajoutez-en un pour commencer.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Dispo</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.reference || "—"}
                    </TableCell>
                    <TableCell>
                      {item.category ? CATEGORY_LABELS[item.category] || item.category : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(item.unit_price).toFixed(2)} €
                    </TableCell>
                    <TableCell>{UNIT_LABELS[item.unit] || item.unit}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_available ? "default" : "secondary"}>
                        {item.is_available ? "Oui" : "Non"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCatalogItem(item);
                            setCatalogFormOpen(true);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCatalogItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SupplierForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        supplier={supplier}
        onSubmit={handleUpdateSupplier}
      />
      <CatalogItemForm
        open={catalogFormOpen}
        onOpenChange={setCatalogFormOpen}
        item={editingCatalogItem}
        onSubmit={editingCatalogItem ? handleUpdateCatalogItem : handleCreateCatalogItem}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/fournisseurs/\[id\]/page.tsx
git commit -m "feat(m06): implement supplier detail page with catalog management"
```

---

## Task 9: M06 Seed Data for LCQF

**Files:**
- Migration or server action to seed test suppliers

- [ ] **Step 1: Insert seed data via Supabase MCP `execute_sql`**

```sql
-- Seed suppliers for La Cabane Qui Fume
INSERT INTO suppliers (restaurant_id, name, contact_name, phone, email, notes) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Metro Cash & Carry', 'Sophie Martin', '02 43 55 12 00', 'pro@metro.fr', 'Livraison mardi et vendredi. Minimum 150€ HT.'),
  ('a0000000-0000-0000-0000-000000000001', 'Pomona TerreAzur', 'Marc Dupont', '02 43 78 34 56', 'contact@pomona.fr', 'Fruits et légumes frais. Livraison quotidienne sauf dimanche.'),
  ('a0000000-0000-0000-0000-000000000001', 'Brake France', 'Julie Leblanc', '02 43 90 11 22', 'commande@brake.fr', 'Surgelés et épicerie. Commande avant mercredi pour livraison lundi.'),
  ('a0000000-0000-0000-0000-000000000001', 'Brasserie de la Sarthe', 'Pierre Moreau', '02 43 24 67 89', 'pro@brasserie72.fr', 'Bières artisanales. Livraison mensuelle ou sur demande.'),
  ('a0000000-0000-0000-0000-000000000001', 'Cave du Mans', 'Antoine Girard', '02 43 87 45 23', 'commande@cavelemans.fr', 'Vins et spiritueux. Commande 48h à l''avance.');

-- Seed catalog items for Metro
INSERT INTO supplier_catalog_items (supplier_id, reference, label, unit, unit_price, category)
SELECT s.id, ref, lab, un, pr, cat
FROM suppliers s,
(VALUES
  ('MET-001', 'Entrecôte Black Angus 300g', 'kg', 32.50, 'viandes'),
  ('MET-002', 'Poitrine de porc fumée', 'kg', 8.90, 'viandes'),
  ('MET-003', 'Travers de porc', 'kg', 7.50, 'viandes'),
  ('MET-004', 'Cheddar affiné tranché', 'kg', 12.80, 'produits_laitiers'),
  ('MET-005', 'Pain burger brioché x12', 'pack', 4.50, 'épicerie'),
  ('MET-006', 'Sauce BBQ Smoky 1L', 'L', 6.20, 'épicerie'),
  ('MET-007', 'Coca-Cola 33cl x24', 'pack', 14.40, 'boissons')
) AS t(ref, lab, un, pr, cat)
WHERE s.name = 'Metro Cash & Carry' AND s.restaurant_id = 'a0000000-0000-0000-0000-000000000001';

-- Seed catalog items for Pomona
INSERT INTO supplier_catalog_items (supplier_id, reference, label, unit, unit_price, category)
SELECT s.id, ref, lab, un, pr, cat
FROM suppliers s,
(VALUES
  ('POM-001', 'Tomates grappe', 'kg', 3.20, 'légumes'),
  ('POM-002', 'Salade batavia', 'piece', 0.90, 'légumes'),
  ('POM-003', 'Oignons rouges', 'kg', 2.10, 'légumes'),
  ('POM-004', 'Cornichons bocal 1L', 'piece', 3.80, 'épicerie')
) AS t(ref, lab, un, pr, cat)
WHERE s.name = 'Pomona TerreAzur' AND s.restaurant_id = 'a0000000-0000-0000-0000-000000000001';
```

- [ ] **Step 2: Verify data**

```sql
SELECT s.name, count(c.id) as items
FROM suppliers s
LEFT JOIN supplier_catalog_items c ON c.supplier_id = s.id
WHERE s.restaurant_id = 'a0000000-0000-0000-0000-000000000001'
GROUP BY s.name ORDER BY s.name;
```

Expected: 5 suppliers, Metro with 7 items, Pomona with 4 items, others with 0.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat(m06): seed LCQF supplier data (Metro, Pomona, Brake, Brasserie, Cave)"
```

---

## Task 10: M05 Database Migration

**Files:**
- Create: `supabase/migrations/20260406_stock_achats.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migration: Stock & Achats
-- Date: 2026-04-06
-- Description: Add stock items, movements, purchase orders tables for M05
--              Enrich recipe_ingredients with stock linking

-- 1. Create stock_items table
CREATE TABLE stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text CHECK (category IN ('viandes', 'poissons', 'légumes', 'produits_laitiers', 'boissons', 'épicerie', 'autre')),
  unit text NOT NULL CHECK (unit IN ('kg', 'g', 'L', 'cl', 'piece', 'pack')),
  current_quantity numeric NOT NULL DEFAULT 0,
  alert_threshold numeric NOT NULL DEFAULT 0,
  optimal_quantity numeric NOT NULL DEFAULT 0,
  tracking_mode text NOT NULL DEFAULT 'lot' CHECK (tracking_mode IN ('ingredient', 'lot')),
  unit_cost numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create stock_movements table
CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'consumption', 'waste', 'adjustment', 'return', 'inventory')),
  quantity numeric NOT NULL,
  unit_cost numeric,
  reference_type text CHECK (reference_type IN ('order', 'purchase_order', 'manual', 'inventory')),
  reference_id uuid,
  batch_id uuid,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create purchase_orders table
CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled')),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  total_ht numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create purchase_order_items table
CREATE TABLE purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  catalog_item_id uuid REFERENCES supplier_catalog_items(id),
  quantity_ordered numeric NOT NULL,
  quantity_received numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Enrich recipe_ingredients with stock linking
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS stock_item_id uuid REFERENCES stock_items(id) ON DELETE SET NULL;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS unit text CHECK (unit IN ('kg', 'g', 'L', 'cl', 'piece'));

-- 6. Indexes
CREATE INDEX idx_stock_items_restaurant ON stock_items(restaurant_id);
CREATE INDEX idx_stock_items_alert ON stock_items(restaurant_id, is_active) WHERE current_quantity <= alert_threshold;
CREATE INDEX idx_stock_movements_item ON stock_movements(stock_item_id);
CREATE INDEX idx_stock_movements_batch ON stock_movements(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_purchase_orders_restaurant ON purchase_orders(restaurant_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);

-- 7. RLS policies for stock_items
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock items of their restaurant"
  ON stock_items FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "Users can insert stock items for their restaurant"
  ON stock_items FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "Users can update stock items of their restaurant"
  ON stock_items FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "Users can delete stock items of their restaurant"
  ON stock_items FOR DELETE
  USING (restaurant_id = get_user_restaurant_id());

-- 8. RLS policies for stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movements of their stock"
  ON stock_movements FOR SELECT
  USING (stock_item_id IN (SELECT id FROM stock_items WHERE restaurant_id = get_user_restaurant_id()));
CREATE POLICY "Users can insert movements for their stock"
  ON stock_movements FOR INSERT
  WITH CHECK (stock_item_id IN (SELECT id FROM stock_items WHERE restaurant_id = get_user_restaurant_id()));

-- 9. RLS policies for purchase_orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view purchase orders of their restaurant"
  ON purchase_orders FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "Users can insert purchase orders for their restaurant"
  ON purchase_orders FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "Users can update purchase orders of their restaurant"
  ON purchase_orders FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id());

-- 10. RLS policies for purchase_order_items
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items of their purchase orders"
  ON purchase_order_items FOR SELECT
  USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE restaurant_id = get_user_restaurant_id()));
CREATE POLICY "Users can insert items for their purchase orders"
  ON purchase_order_items FOR INSERT
  WITH CHECK (purchase_order_id IN (SELECT id FROM purchase_orders WHERE restaurant_id = get_user_restaurant_id()));
CREATE POLICY "Users can update items of their purchase orders"
  ON purchase_order_items FOR UPDATE
  USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE restaurant_id = get_user_restaurant_id()));
```

- [ ] **Step 2: Apply migration via Supabase MCP**

- [ ] **Step 3: Regenerate TypeScript types**

```bash
cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360
npx supabase gen types typescript --project-id vymwkwziytcetjlvtbcc > src/types/database.types.ts
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260406_stock_achats.sql src/types/database.types.ts
git commit -m "feat(m05): add stock items, movements, purchase orders tables with RLS"
```

---

## Task 11: M05 Server Actions — Stock Items & Movements

**Files:**
- Create: `src/app/(dashboard)/stock/actions.ts`

- [ ] **Step 1: Create server actions file with stock item and movement operations**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Tables, Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StockItemRow = Tables<"stock_items">;
type StockItemInsert = Database["public"]["Tables"]["stock_items"]["Insert"];
type StockItemUpdate = Database["public"]["Tables"]["stock_items"]["Update"];
type StockMovementRow = Tables<"stock_movements">;
type PurchaseOrderRow = Tables<"purchase_orders">;
type PurchaseOrderItemRow = Tables<"purchase_order_items">;

export type StockCategory =
  | "viandes"
  | "poissons"
  | "légumes"
  | "produits_laitiers"
  | "boissons"
  | "épicerie"
  | "autre";

export type MovementType = "purchase" | "consumption" | "waste" | "adjustment" | "return" | "inventory";
export type TrackingMode = "ingredient" | "lot";
export type PurchaseOrderStatus = "draft" | "sent" | "partially_received" | "received" | "cancelled";

export type StockStatus = "ok" | "low" | "critical";

export interface StockItemFilters {
  category?: StockCategory;
  status?: StockStatus;
  trackingMode?: TrackingMode;
  search?: string;
}

export interface MovementFilters {
  type?: MovementType;
  stockItemId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus;
  supplierId?: string;
}

export interface StockStats {
  total: number;
  alertsCount: number;
  totalValue: number;
}

export interface StockItemWithStatus extends StockItemRow {
  stock_status: StockStatus;
}

export interface PurchaseOrderWithSupplier extends PurchaseOrderRow {
  supplier_name: string;
}

export interface PurchaseOrderDetail extends PurchaseOrderRow {
  supplier_name: string;
  items: (PurchaseOrderItemRow & { stock_item_name: string; stock_item_unit: string })[];
}

export interface SuggestedItem {
  stock_item_id: string;
  stock_item_name: string;
  unit: string;
  current_quantity: number;
  optimal_quantity: number;
  suggested_quantity: number;
  catalog_item_id: string | null;
  unit_price: number;
}

export interface InventoryLine {
  stock_item_id: string | null;
  name: string;
  unit: string;
  category: string;
  counted_quantity: number;
  system_quantity: number;
  action: "update" | "create" | "ignore";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    throw new Error("Aucun restaurant associé à votre compte.");
  }
  return profile.restaurant_id;
}

function computeStockStatus(item: StockItemRow): StockStatus {
  if (Number(item.current_quantity) <= 0) return "critical";
  if (Number(item.current_quantity) <= Number(item.alert_threshold)) return "low";
  return "ok";
}

// ---------------------------------------------------------------------------
// Stock Items — Queries
// ---------------------------------------------------------------------------

export async function getStockItems(
  filters: StockItemFilters = {}
): Promise<StockItemWithStatus[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("stock_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (filters.trackingMode) {
    query = query.eq("tracking_mode", filters.trackingMode);
  }
  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger le stock.");

  let items = (data || []).map((item) => ({
    ...item,
    stock_status: computeStockStatus(item) as StockStatus,
  }));

  if (filters.status) {
    items = items.filter((i) => i.stock_status === filters.status);
  }

  return items;
}

export async function getStockItem(
  id: string
): Promise<{ item: StockItemWithStatus; movements: StockMovementRow[] }> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("stock_items")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (error || !item) throw new Error("Article introuvable.");

  const { data: movements } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("stock_item_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    item: { ...item, stock_status: computeStockStatus(item) },
    movements: movements || [],
  };
}

export async function getStockStats(): Promise<StockStats> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("stock_items")
    .select("current_quantity, alert_threshold, unit_cost")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  const items = data || [];
  return {
    total: items.length,
    alertsCount: items.filter(
      (i) => Number(i.current_quantity) <= Number(i.alert_threshold)
    ).length,
    totalValue: items.reduce(
      (sum, i) => sum + Number(i.current_quantity) * Number(i.unit_cost),
      0
    ),
  };
}

export async function getStockAlerts(): Promise<StockItemWithStatus[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("stock_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("name");

  return (data || [])
    .filter((i) => Number(i.current_quantity) <= Number(i.alert_threshold))
    .map((i) => ({ ...i, stock_status: computeStockStatus(i) }));
}

// ---------------------------------------------------------------------------
// Stock Items — Mutations
// ---------------------------------------------------------------------------

export async function createStockItem(
  data: Omit<StockItemInsert, "id" | "restaurant_id" | "created_at" | "updated_at">
): Promise<StockItemRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("stock_items")
    .insert({ ...data, restaurant_id: restaurantId })
    .select()
    .single();

  if (error) throw new Error("Impossible de créer l'article.");
  return item;
}

export async function updateStockItem(
  id: string,
  data: Omit<StockItemUpdate, "id" | "restaurant_id" | "created_at">
): Promise<StockItemRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("stock_items")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error("Impossible de modifier l'article.");
  return item;
}

// ---------------------------------------------------------------------------
// Stock Movements — Queries & Mutations
// ---------------------------------------------------------------------------

export async function getStockMovements(
  filters: MovementFilters = {}
): Promise<(StockMovementRow & { stock_item_name: string })[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Get stock item ids for this restaurant
  const { data: stockItems } = await supabase
    .from("stock_items")
    .select("id, name")
    .eq("restaurant_id", restaurantId);

  const itemMap = new Map((stockItems || []).map((i) => [i.id, i.name]));
  const itemIds = Array.from(itemMap.keys());

  if (itemIds.length === 0) return [];

  let query = supabase
    .from("stock_movements")
    .select("*")
    .in("stock_item_id", itemIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.stockItemId) {
    query = query.eq("stock_item_id", filters.stockItemId);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw new Error("Impossible de charger les mouvements.");

  return (data || []).map((m) => ({
    ...m,
    stock_item_name: itemMap.get(m.stock_item_id) || "Inconnu",
  }));
}

export async function createManualMovement(data: {
  stock_item_id: string;
  type: MovementType;
  quantity: number;
  notes?: string;
}): Promise<StockMovementRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Verify item belongs to restaurant
  const { data: item } = await supabase
    .from("stock_items")
    .select("id, current_quantity")
    .eq("id", data.stock_item_id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!item) throw new Error("Article introuvable.");

  // Create movement
  const { data: { user } } = await supabase.auth.getUser();
  const { data: movement, error: movError } = await supabase
    .from("stock_movements")
    .insert({
      stock_item_id: data.stock_item_id,
      type: data.type,
      quantity: data.quantity,
      reference_type: "manual",
      notes: data.notes || null,
      created_by: user!.id,
    })
    .select()
    .single();

  if (movError) throw new Error("Impossible de créer le mouvement.");

  // Update current_quantity
  const newQty = Number(item.current_quantity) + data.quantity;
  await supabase
    .from("stock_items")
    .update({ current_quantity: newQty, updated_at: new Date().toISOString() })
    .eq("id", data.stock_item_id);

  return movement;
}

export async function processInventory(
  lines: InventoryLine[]
): Promise<{ updated: number; created: number }> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const batchId = crypto.randomUUID();

  let updated = 0;
  let created = 0;

  for (const line of lines) {
    if (line.action === "ignore") continue;

    if (line.action === "create") {
      // Create new stock item
      const { data: newItem } = await supabase
        .from("stock_items")
        .insert({
          restaurant_id: restaurantId,
          name: line.name,
          unit: line.unit,
          category: line.category,
          current_quantity: line.counted_quantity,
          tracking_mode: "lot",
        })
        .select()
        .single();

      if (newItem) {
        await supabase.from("stock_movements").insert({
          stock_item_id: newItem.id,
          type: "inventory",
          quantity: line.counted_quantity,
          reference_type: "inventory",
          batch_id: batchId,
          created_by: user!.id,
        });
        created++;
      }
    } else if (line.action === "update" && line.stock_item_id) {
      const diff = line.counted_quantity - line.system_quantity;
      if (diff !== 0) {
        await supabase.from("stock_movements").insert({
          stock_item_id: line.stock_item_id,
          type: "inventory",
          quantity: diff,
          reference_type: "inventory",
          batch_id: batchId,
          notes: `Inventaire: ${line.system_quantity} → ${line.counted_quantity}`,
          created_by: user!.id,
        });

        await supabase
          .from("stock_items")
          .update({
            current_quantity: line.counted_quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", line.stock_item_id);

        updated++;
      }
    }
  }

  return { updated, created };
}

// ---------------------------------------------------------------------------
// Purchase Orders — Queries & Mutations
// ---------------------------------------------------------------------------

export async function getPurchaseOrders(
  filters: PurchaseOrderFilters = {}
): Promise<PurchaseOrderWithSupplier[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("purchase_orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.supplierId) {
    query = query.eq("supplier_id", filters.supplierId);
  }

  const { data: orders, error } = await query;
  if (error) throw new Error("Impossible de charger les bons de commande.");

  // Get supplier names
  const supplierIds = [...new Set((orders || []).map((o) => o.supplier_id))];
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name")
    .in("id", supplierIds);

  const supplierMap = new Map((suppliers || []).map((s) => [s.id, s.name]));

  return (orders || []).map((o) => ({
    ...o,
    supplier_name: supplierMap.get(o.supplier_id) || "Inconnu",
  }));
}

export async function getPurchaseOrder(
  id: string
): Promise<PurchaseOrderDetail> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (error || !order) throw new Error("Bon de commande introuvable.");

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("name")
    .eq("id", order.supplier_id)
    .single();

  const { data: poItems } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", id);

  // Get stock item names
  const stockIds = [...new Set((poItems || []).map((i) => i.stock_item_id))];
  const { data: stockItems } = await supabase
    .from("stock_items")
    .select("id, name, unit")
    .in("id", stockIds);

  const stockMap = new Map(
    (stockItems || []).map((s) => [s.id, { name: s.name, unit: s.unit }])
  );

  return {
    ...order,
    supplier_name: supplier?.name || "Inconnu",
    items: (poItems || []).map((i) => ({
      ...i,
      stock_item_name: stockMap.get(i.stock_item_id)?.name || "Inconnu",
      stock_item_unit: stockMap.get(i.stock_item_id)?.unit || "",
    })),
  };
}

export async function createPurchaseOrder(
  supplierId: string,
  items: { stock_item_id: string; quantity: number; unit_price: number; catalog_item_id?: string }[],
  notes?: string,
  expectedDeliveryDate?: string
): Promise<PurchaseOrderRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const totalHt = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .insert({
      restaurant_id: restaurantId,
      supplier_id: supplierId,
      total_ht: totalHt,
      notes: notes || null,
      expected_delivery_date: expectedDeliveryDate || null,
      created_by: user!.id,
    })
    .select()
    .single();

  if (error || !order) throw new Error("Impossible de créer le bon de commande.");

  const poItems = items.map((i) => ({
    purchase_order_id: order.id,
    stock_item_id: i.stock_item_id,
    catalog_item_id: i.catalog_item_id || null,
    quantity_ordered: i.quantity,
    unit_price: i.unit_price,
  }));

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(poItems);

  if (itemsError) throw new Error("Impossible d'ajouter les articles au bon.");

  return order;
}

export async function sendPurchaseOrder(id: string): Promise<PurchaseOrderRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_orders")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .eq("status", "draft")
    .select()
    .single();

  if (error || !data) throw new Error("Impossible d'envoyer le bon de commande.");
  return data;
}

export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrderRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error || !data) throw new Error("Impossible d'annuler le bon de commande.");
  return data;
}

export async function receivePurchaseOrder(
  id: string,
  receivedItems: { item_id: string; quantity_received: number }[]
): Promise<PurchaseOrderRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Update each PO item and create stock movements
  for (const received of receivedItems) {
    const { data: poItem } = await supabase
      .from("purchase_order_items")
      .select("*, purchase_order_id")
      .eq("id", received.item_id)
      .single();

    if (!poItem) continue;

    // Update received quantity
    await supabase
      .from("purchase_order_items")
      .update({ quantity_received: received.quantity_received })
      .eq("id", received.item_id);

    // Create stock movement
    if (received.quantity_received > 0) {
      await supabase.from("stock_movements").insert({
        stock_item_id: poItem.stock_item_id,
        type: "purchase",
        quantity: received.quantity_received,
        unit_cost: Number(poItem.unit_price),
        reference_type: "purchase_order",
        reference_id: id,
        created_by: user!.id,
      });

      // Update stock item quantity and cost
      const { data: stockItem } = await supabase
        .from("stock_items")
        .select("current_quantity")
        .eq("id", poItem.stock_item_id)
        .single();

      if (stockItem) {
        await supabase
          .from("stock_items")
          .update({
            current_quantity: Number(stockItem.current_quantity) + received.quantity_received,
            unit_cost: Number(poItem.unit_price),
            updated_at: new Date().toISOString(),
          })
          .eq("id", poItem.stock_item_id);
      }
    }
  }

  // Determine PO status
  const { data: allItems } = await supabase
    .from("purchase_order_items")
    .select("quantity_ordered, quantity_received")
    .eq("purchase_order_id", id);

  const allReceived = (allItems || []).every(
    (i) => Number(i.quantity_received) >= Number(i.quantity_ordered)
  );

  const newStatus = allReceived ? "received" : "partially_received";

  const { data: order, error } = await supabase
    .from("purchase_orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error || !order) throw new Error("Impossible de valider la réception.");
  return order;
}

export async function getSuggestedPurchaseItems(
  supplierId: string
): Promise<SuggestedItem[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Get low stock items
  const { data: stockItems } = await supabase
    .from("stock_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  const lowItems = (stockItems || []).filter(
    (i) => Number(i.current_quantity) < Number(i.alert_threshold)
  );

  if (lowItems.length === 0) return [];

  // Get catalog items for this supplier
  const { data: catalogItems } = await supabase
    .from("supplier_catalog_items")
    .select("*")
    .eq("supplier_id", supplierId)
    .eq("is_available", true);

  // Match by name (simple matching)
  const suggestions: SuggestedItem[] = [];
  for (const stock of lowItems) {
    const match = (catalogItems || []).find(
      (c) => c.label.toLowerCase().includes(stock.name.toLowerCase()) ||
             stock.name.toLowerCase().includes(c.label.toLowerCase())
    );

    suggestions.push({
      stock_item_id: stock.id,
      stock_item_name: stock.name,
      unit: stock.unit,
      current_quantity: Number(stock.current_quantity),
      optimal_quantity: Number(stock.optimal_quantity),
      suggested_quantity: Math.max(0, Number(stock.optimal_quantity) - Number(stock.current_quantity)),
      catalog_item_id: match?.id || null,
      unit_price: match ? Number(match.unit_price) : 0,
    });
  }

  return suggestions.filter((s) => s.suggested_quantity > 0);
}

// ---------------------------------------------------------------------------
// Fuzzy Match for Import
// ---------------------------------------------------------------------------

export async function matchStockItemsByName(
  names: string[]
): Promise<Record<string, { id: string; name: string; current_quantity: number; unit: string } | null>> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: stockItems } = await supabase
    .from("stock_items")
    .select("id, name, current_quantity, unit")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  const items = stockItems || [];
  const result: Record<string, { id: string; name: string; current_quantity: number; unit: string } | null> = {};

  for (const name of names) {
    const lower = name.toLowerCase().trim();
    // Exact match first
    let match = items.find((i) => i.name.toLowerCase() === lower);
    // Partial match
    if (!match) {
      match = items.find(
        (i) =>
          i.name.toLowerCase().includes(lower) ||
          lower.includes(i.name.toLowerCase())
      );
    }
    result[name] = match
      ? { id: match.id, name: match.name, current_quantity: Number(match.current_quantity), unit: match.unit }
      : null;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Template generation
// ---------------------------------------------------------------------------

export async function getStockItemsForTemplate(): Promise<
  { name: string; unit: string; current_quantity: number }[]
> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("stock_items")
    .select("name, unit, current_quantity")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("category")
    .order("name");

  return (data || []).map((i) => ({
    name: i.name,
    unit: i.unit,
    current_quantity: Number(i.current_quantity),
  }));
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/stock/actions.ts
git commit -m "feat(m05): add stock server actions (items, movements, purchase orders, import)"
```

---

## Task 12: M05 Zustand Store + Install SheetJS

**Files:**
- Create: `src/stores/stock.store.ts`

- [ ] **Step 1: Install SheetJS**

```bash
cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360
npm install xlsx
```

- [ ] **Step 2: Create the store**

```typescript
import { create } from "zustand";

type StockTab = "inventaire" | "mouvements" | "achats";

interface StockState {
  activeTab: StockTab;
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  trackingFilter: string;
  stockItemFormOpen: boolean;
  selectedStockItemId: string | null;
  movementFormOpen: boolean;
  importDialogOpen: boolean;
  setActiveTab: (tab: StockTab) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (cat: string) => void;
  setStatusFilter: (status: string) => void;
  setTrackingFilter: (mode: string) => void;
  setStockItemFormOpen: (open: boolean) => void;
  setSelectedStockItemId: (id: string | null) => void;
  setMovementFormOpen: (open: boolean) => void;
  setImportDialogOpen: (open: boolean) => void;
}

export const useStockStore = create<StockState>((set) => ({
  activeTab: "inventaire",
  searchQuery: "",
  categoryFilter: "",
  statusFilter: "",
  trackingFilter: "",
  stockItemFormOpen: false,
  selectedStockItemId: null,
  movementFormOpen: false,
  importDialogOpen: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setTrackingFilter: (mode) => set({ trackingFilter: mode }),
  setStockItemFormOpen: (open) => set({ stockItemFormOpen: open }),
  setSelectedStockItemId: (id) => set({ selectedStockItemId: id }),
  setMovementFormOpen: (open) => set({ movementFormOpen: open }),
  setImportDialogOpen: (open) => set({ importDialogOpen: open }),
}));
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/stock.store.ts package.json package-lock.json
git commit -m "feat(m05): add stock Zustand store and install SheetJS"
```

---

## Task 13: M05 Stock Item Form Component

**Files:**
- Create: `src/components/modules/stock/stock-item-form.tsx`

- [ ] **Step 1: Create the stock item form dialog**

Same pattern as supplier-form.tsx and catalog-item-form.tsx. Fields: name*, category, unit*, current_quantity, alert_threshold, optimal_quantity, tracking_mode (ingredient/lot), unit_cost.

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/types/database.types";

type StockItem = Tables<"stock_items">;

export interface StockItemFormData {
  name: string;
  category: string;
  unit: string;
  current_quantity: number;
  alert_threshold: number;
  optimal_quantity: number;
  tracking_mode: string;
  unit_cost: number;
}

interface StockItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: StockItem | null;
  onSubmit: (data: StockItemFormData) => Promise<void>;
}

const UNITS = [
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "g", label: "Gramme (g)" },
  { value: "L", label: "Litre (L)" },
  { value: "cl", label: "Centilitre (cl)" },
  { value: "piece", label: "Pièce" },
  { value: "pack", label: "Pack / Lot" },
];

const CATEGORIES = [
  { value: "viandes", label: "Viandes" },
  { value: "poissons", label: "Poissons" },
  { value: "légumes", label: "Légumes" },
  { value: "produits_laitiers", label: "Produits laitiers" },
  { value: "boissons", label: "Boissons" },
  { value: "épicerie", label: "Épicerie" },
  { value: "autre", label: "Autre" },
];

const emptyForm: StockItemFormData = {
  name: "",
  category: "autre",
  unit: "kg",
  current_quantity: 0,
  alert_threshold: 0,
  optimal_quantity: 0,
  tracking_mode: "lot",
  unit_cost: 0,
};

export function StockItemForm({ open, onOpenChange, item, onSubmit }: StockItemFormProps) {
  const [form, setForm] = useState<StockItemFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEditing = !!item;

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              name: item.name,
              category: item.category || "autre",
              unit: item.unit,
              current_quantity: Number(item.current_quantity),
              alert_threshold: Number(item.alert_threshold),
              optimal_quantity: Number(item.optimal_quantity),
              tracking_mode: item.tracking_mode,
              unit_cost: Number(item.unit_cost),
            }
          : emptyForm
      );
    }
  }, [open, item]);

  function updateField<K extends keyof StockItemFormData>(key: K, value: StockItemFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier l'article" : "Nouvel article de stock"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unité *</Label>
              <Select value={form.unit} onValueChange={(v) => updateField("unit", v)}>
                <SelectTrigger id="unit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_quantity">Quantité actuelle</Label>
              <Input id="current_quantity" type="number" step="0.01" value={form.current_quantity}
                onChange={(e) => updateField("current_quantity", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert_threshold">Seuil alerte</Label>
              <Input id="alert_threshold" type="number" step="0.01" value={form.alert_threshold}
                onChange={(e) => updateField("alert_threshold", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="optimal_quantity">Quantité optimale</Label>
              <Input id="optimal_quantity" type="number" step="0.01" value={form.optimal_quantity}
                onChange={(e) => updateField("optimal_quantity", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tracking_mode">Mode de suivi</Label>
              <Select value={form.tracking_mode} onValueChange={(v) => updateField("tracking_mode", v)}>
                <SelectTrigger id="tracking_mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lot">Lot (inventaire périodique)</SelectItem>
                  <SelectItem value="ingredient">Ingrédient (déduction auto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Coût unitaire (€)</Label>
              <Input id="unit_cost" type="number" step="0.01" min="0" value={form.unit_cost}
                onChange={(e) => updateField("unit_cost", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "Enregistrement..." : isEditing ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/stock/stock-item-form.tsx
git commit -m "feat(m05): add stock item form dialog component"
```

---

## Task 14: M05 Movement Form Component

**Files:**
- Create: `src/components/modules/stock/movement-form.tsx`

- [ ] **Step 1: Create manual movement dialog**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/types/database.types";

type StockItem = Tables<"stock_items">;

interface MovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItems: StockItem[];
  onSubmit: (data: {
    stock_item_id: string;
    type: string;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
}

const MOVEMENT_TYPES = [
  { value: "adjustment", label: "Ajustement" },
  { value: "waste", label: "Perte / Déchet" },
  { value: "return", label: "Retour fournisseur" },
  { value: "consumption", label: "Consommation manuelle" },
];

export function MovementForm({ open, onOpenChange, stockItems, onSubmit }: MovementFormProps) {
  const [stockItemId, setStockItemId] = useState("");
  const [type, setType] = useState("adjustment");
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Waste and consumption are negative
      const finalQty = ["waste", "consumption"].includes(type)
        ? -Math.abs(quantity)
        : quantity;
      await onSubmit({ stock_item_id: stockItemId, type, quantity: finalQty, notes: notes || undefined });
      onOpenChange(false);
      setStockItemId("");
      setType("adjustment");
      setQuantity(0);
      setNotes("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Mouvement manuel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stock_item">Article *</Label>
            <Select value={stockItemId} onValueChange={setStockItemId}>
              <SelectTrigger id="stock_item"><SelectValue placeholder="Sélectionner un article" /></SelectTrigger>
              <SelectContent>
                {stockItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name} ({item.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input id="quantity" type="number" step="0.01" min="0.01" value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving || !stockItemId || quantity <= 0}>
              {saving ? "Enregistrement..." : "Valider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/stock/movement-form.tsx
git commit -m "feat(m05): add manual movement form dialog"
```

---

## Task 15: M05 Inventory Import Utils

**Files:**
- Create: `src/lib/inventory-import.ts`

- [ ] **Step 1: Create SheetJS parsing utilities**

```typescript
import * as XLSX from "xlsx";

export interface ParsedRow {
  name: string;
  quantity: number | null;
  unit: string;
  rawRow: Record<string, unknown>;
}

export interface ColumnMapping {
  name: string | null;
  quantity: string | null;
  unit: string | null;
}

const NAME_PATTERNS = ["nom", "article", "produit", "désignation", "name", "item"];
const QUANTITY_PATTERNS = ["quantité", "qté", "qty", "quantity", "comptée", "counted", "stock"];
const UNIT_PATTERNS = ["unité", "unit", "u.m.", "mesure"];

function detectColumn(headers: string[], patterns: string[]): string | null {
  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    if (patterns.some((p) => lower.includes(p))) return header;
  }
  return null;
}

export function detectColumns(headers: string[]): ColumnMapping {
  return {
    name: detectColumn(headers, NAME_PATTERNS),
    quantity: detectColumn(headers, QUANTITY_PATTERNS),
    unit: detectColumn(headers, UNIT_PATTERNS),
  };
}

export function parseFile(file: ArrayBuffer): { headers: string[]; rows: Record<string, unknown>[] } {
  const workbook = XLSX.read(file, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (jsonData.length === 0) return { headers: [], rows: [] };

  const headers = Object.keys(jsonData[0]);
  return { headers, rows: jsonData };
}

export function extractRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping
): ParsedRow[] {
  return rows
    .map((row) => ({
      name: mapping.name ? String(row[mapping.name] || "").trim() : "",
      quantity: mapping.quantity ? parseFloat(String(row[mapping.quantity])) || null : null,
      unit: mapping.unit ? String(row[mapping.unit] || "").trim() : "",
      rawRow: row,
    }))
    .filter((r) => r.name.length > 0);
}

export function generateTemplate(
  items: { name: string; unit: string; current_quantity: number }[]
): ArrayBuffer {
  const data = items.map((i) => ({
    "Article": i.name,
    "Unité": i.unit,
    "Quantité système": i.current_quantity,
    "Quantité comptée": "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaire");

  // Set column widths
  worksheet["!cols"] = [
    { wch: 30 }, // Article
    { wch: 10 }, // Unité
    { wch: 18 }, // Quantité système
    { wch: 18 }, // Quantité comptée
  ];

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/inventory-import.ts
git commit -m "feat(m05): add SheetJS inventory import/export utilities"
```

---

## Task 16: M05 Import Dialog Component

**Files:**
- Create: `src/components/modules/stock/inventory-import-dialog.tsx`

- [ ] **Step 1: Create the multi-step import dialog**

This is a large component with 4 steps (Upload → Mapping → Preview → Validation). Create as a single file since all steps share state.

```typescript
"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  parseFile,
  detectColumns,
  extractRows,
  type ColumnMapping,
  type ParsedRow,
} from "@/lib/inventory-import";
import type { InventoryLine } from "@/app/(dashboard)/stock/actions";

interface MatchedItem {
  id: string;
  name: string;
  current_quantity: number;
  unit: string;
}

interface ImportLine extends ParsedRow {
  matchedItem: MatchedItem | null;
  countedQuantity: number;
  action: "update" | "create" | "ignore";
  category: string;
}

interface InventoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMatchNames: (names: string[]) => Promise<Record<string, MatchedItem | null>>;
  onSubmit: (lines: InventoryLine[]) => Promise<{ updated: number; created: number }>;
}

export function InventoryImportDialog({
  open,
  onOpenChange,
  onMatchNames,
  onSubmit,
}: InventoryImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ name: null, quantity: null, unit: null });
  const [lines, setLines] = useState<ImportLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ updated: number; created: number } | null>(null);

  function reset() {
    setStep(1);
    setHeaders([]);
    setRawRows([]);
    setMapping({ name: null, quantity: null, unit: null });
    setLines([]);
    setResult(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const { headers: h, rows } = parseFile(buffer);
    setHeaders(h);
    setRawRows(rows);
    setMapping(detectColumns(h));
    setStep(2);
  }

  async function handleMappingConfirm() {
    const parsed = extractRows(rawRows, mapping);
    const names = parsed.map((r) => r.name);
    const matches = await onMatchNames(names);

    const importLines: ImportLine[] = parsed.map((row) => {
      const match = matches[row.name];
      return {
        ...row,
        matchedItem: match || null,
        countedQuantity: row.quantity ?? 0,
        action: match ? "update" : "create",
        category: "autre",
      };
    });

    setLines(importLines);
    setStep(3);
  }

  function updateLine(index: number, updates: Partial<ImportLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const inventoryLines: InventoryLine[] = lines
        .filter((l) => l.action !== "ignore")
        .map((l) => ({
          stock_item_id: l.matchedItem?.id || null,
          name: l.name,
          unit: l.matchedItem?.unit || l.unit || "piece",
          category: l.category,
          counted_quantity: l.countedQuantity,
          system_quantity: l.matchedItem?.current_quantity || 0,
          action: l.action,
        }));

      const res = await onSubmit(inventoryLines);
      setResult(res);
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Importer un inventaire — Étape {step}/4
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Glissez un fichier .xlsx ou .csv ici, ou cliquez pour sélectionner
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Choisir un fichier
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vérifiez le mapping des colonnes détectées ({rawRows.length} lignes trouvées)
            </p>
            {["name", "quantity", "unit"].map((field) => (
              <div key={field} className="grid grid-cols-2 gap-4 items-center">
                <span className="text-sm font-medium">
                  {field === "name" ? "Nom article" : field === "quantity" ? "Quantité comptée" : "Unité"}
                </span>
                <Select
                  value={mapping[field as keyof ColumnMapping] || ""}
                  onValueChange={(v) => setMapping((m) => ({ ...m, [field]: v || null }))}
                >
                  <SelectTrigger><SelectValue placeholder="Colonne non détectée" /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
              <Button onClick={handleMappingConfirm} disabled={!mapping.name}>
                Continuer
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vérifiez et ajustez les lignes avant validation
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Match stock</TableHead>
                  <TableHead className="text-right">Qté comptée</TableHead>
                  <TableHead className="text-right">Qté système</TableHead>
                  <TableHead className="text-right">Écart</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => {
                  const diff = line.matchedItem
                    ? line.countedQuantity - line.matchedItem.current_quantity
                    : 0;
                  const pctDiff = line.matchedItem?.current_quantity
                    ? Math.abs(diff / line.matchedItem.current_quantity) * 100
                    : 0;

                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{line.name}</TableCell>
                      <TableCell>
                        {line.matchedItem ? (
                          <Badge variant="default">{line.matchedItem.name}</Badge>
                        ) : (
                          <Badge variant="secondary">Nouveau</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.countedQuantity}
                          onChange={(e) =>
                            updateLine(i, { countedQuantity: parseFloat(e.target.value) || 0 })
                          }
                          className="w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {line.matchedItem?.current_quantity ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.matchedItem ? (
                          <span className={pctDiff > 10 ? "text-destructive font-medium" : ""}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                            {pctDiff > 10 && <AlertTriangle className="inline ml-1 h-3.5 w-3.5" />}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.action}
                          onValueChange={(v) =>
                            updateLine(i, { action: v as "update" | "create" | "ignore" })
                          }
                        >
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {line.matchedItem && <SelectItem value="update">Mettre à jour</SelectItem>}
                            <SelectItem value="create">Créer nouveau</SelectItem>
                            <SelectItem value="ignore">Ignorer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Traitement..." : "Valider l'inventaire"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && result && (
          <div className="flex flex-col items-center py-8">
            <Check className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold">Inventaire importé</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {result.updated} article{result.updated > 1 ? "s" : ""} mis à jour,{" "}
              {result.created} créé{result.created > 1 ? "s" : ""}
            </p>
            <Button className="mt-6" onClick={() => { reset(); onOpenChange(false); }}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/stock/inventory-import-dialog.tsx
git commit -m "feat(m05): add multi-step inventory import dialog with Excel parsing"
```

---

## Task 17: M05 Stock Main Page

**Files:**
- Modify: `src/app/(dashboard)/stock/page.tsx` (replace stub)

- [ ] **Step 1: Replace the stub page with the full tabbed implementation**

Replace the entire content of `src/app/(dashboard)/stock/page.tsx`. This page has 3 tabs: Inventaire, Mouvements, Achats.

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownUp,
  Download,
  Euro,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStockStore } from "@/stores/stock.store";
import { StockItemForm } from "@/components/modules/stock/stock-item-form";
import type { StockItemFormData } from "@/components/modules/stock/stock-item-form";
import { MovementForm } from "@/components/modules/stock/movement-form";
import { InventoryImportDialog } from "@/components/modules/stock/inventory-import-dialog";
import { generateTemplate } from "@/lib/inventory-import";
import {
  getStockItems,
  getStockStats,
  getStockMovements,
  getPurchaseOrders,
  createStockItem,
  updateStockItem,
  createManualMovement,
  processInventory,
  matchStockItemsByName,
  getStockItemsForTemplate,
} from "./actions";
import type {
  StockItemWithStatus,
  StockStats,
  StockCategory,
  StockStatus,
  TrackingMode,
  MovementType,
  PurchaseOrderWithSupplier,
  InventoryLine,
} from "./actions";
import type { Tables } from "@/types/database.types";

type StockMovementRow = Tables<"stock_movements">;

const STATUS_LABELS: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ok: { label: "OK", variant: "default" },
  low: { label: "Bas", variant: "secondary" },
  critical: { label: "Critique", variant: "destructive" },
};

const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
  purchase: { label: "Achat", color: "text-green-600" },
  consumption: { label: "Consommation", color: "text-orange-600" },
  waste: { label: "Perte", color: "text-red-600" },
  adjustment: { label: "Ajustement", color: "text-blue-600" },
  return: { label: "Retour", color: "text-purple-600" },
  inventory: { label: "Inventaire", color: "text-cyan-600" },
};

const PO_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  sent: { label: "Envoyé", variant: "default" },
  partially_received: { label: "Partiel", variant: "secondary" },
  received: { label: "Reçu", variant: "default" },
  cancelled: { label: "Annulé", variant: "destructive" },
};

const UNIT_LABELS: Record<string, string> = { kg: "kg", g: "g", L: "L", cl: "cl", piece: "pce", pack: "pack" };

export default function StockPage() {
  const router = useRouter();
  const store = useStockStore();

  const [items, setItems] = useState<StockItemWithStatus[]>([]);
  const [stats, setStats] = useState<StockStats | null>(null);
  const [movements, setMovements] = useState<(StockMovementRow & { stock_item_name: string })[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Tables<"stock_items"> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [itemsData, statsData, movData, poData] = await Promise.all([
        getStockItems({
          category: (store.categoryFilter || undefined) as StockCategory | undefined,
          status: (store.statusFilter || undefined) as StockStatus | undefined,
          trackingMode: (store.trackingFilter || undefined) as TrackingMode | undefined,
          search: store.searchQuery || undefined,
        }),
        getStockStats(),
        getStockMovements({}),
        getPurchaseOrders({}),
      ]);
      setItems(itemsData);
      setStats(statsData);
      setMovements(movData);
      setPurchaseOrders(poData);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [store.categoryFilter, store.statusFilter, store.trackingFilter, store.searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreateItem(data: StockItemFormData) {
    try { await createStockItem(data); toast.success("Article créé"); loadData(); } catch { toast.error("Erreur"); }
  }
  async function handleUpdateItem(data: StockItemFormData) {
    if (!store.selectedStockItemId) return;
    try { await updateStockItem(store.selectedStockItemId, data); toast.success("Article modifié"); loadData(); } catch { toast.error("Erreur"); }
  }
  async function handleMovement(data: { stock_item_id: string; type: string; quantity: number; notes?: string }) {
    try {
      await createManualMovement(data as Parameters<typeof createManualMovement>[0]);
      toast.success("Mouvement enregistré");
      loadData();
    } catch { toast.error("Erreur"); }
  }
  async function handleDownloadTemplate() {
    try {
      const items = await getStockItemsForTemplate();
      const buffer = generateTemplate(items);
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventaire-modele-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Erreur lors du téléchargement"); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock & Achats</h1>
          <p className="text-muted-foreground">Gestion des stocks, mouvements et bons de commande</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="flex items-center gap-3 p-4">
            <Package className="h-8 w-8 text-primary" />
            <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Articles en stock</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div><p className="text-2xl font-bold">{stats.alertsCount}</p><p className="text-sm text-muted-foreground">Alertes stock bas</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4">
            <Euro className="h-8 w-8 text-green-600" />
            <div><p className="text-2xl font-bold">{stats.totalValue.toFixed(0)} €</p><p className="text-sm text-muted-foreground">Valeur totale du stock</p></div>
          </CardContent></Card>
        </div>
      )}

      <Tabs value={store.activeTab} onValueChange={(v) => store.setActiveTab(v as "inventaire" | "mouvements" | "achats")}>
        <TabsList>
          <TabsTrigger value="inventaire">Inventaire</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
          <TabsTrigger value="achats">Achats</TabsTrigger>
        </TabsList>

        {/* Tab: Inventaire */}
        <TabsContent value="inventaire" className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={store.searchQuery} onChange={(e) => store.setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={store.statusFilter} onValueChange={store.setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="low">Bas</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditingItem(null); store.setSelectedStockItemId(null); store.setStockItemFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Nouvel article
            </Button>
            <Button variant="outline" onClick={() => store.setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />Importer
            </Button>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />Modèle
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="text-right">Seuil</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Suivi</TableHead>
                <TableHead className="text-right">Coût unit.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const s = STATUS_LABELS[item.stock_status];
                return (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => {
                    setEditingItem(item); store.setSelectedStockItemId(item.id); store.setStockItemFormOpen(true);
                  }}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.category || "—"}</TableCell>
                    <TableCell className="text-right font-mono">{Number(item.current_quantity).toFixed(2)}</TableCell>
                    <TableCell>{UNIT_LABELS[item.unit] || item.unit}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{Number(item.alert_threshold).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{item.tracking_mode === "ingredient" ? "Ingrédient" : "Lot"}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{Number(item.unit_cost).toFixed(2)} €</TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucun article de stock</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Tab: Mouvements */}
        <TabsContent value="mouvements" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => store.setMovementFormOpen(true)}>
              <ArrowDownUp className="mr-2 h-4 w-4" />Mouvement manuel
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => {
                const ml = MOVEMENT_LABELS[m.type] || { label: m.type, color: "" };
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</TableCell>
                    <TableCell className="font-medium">{m.stock_item_name}</TableCell>
                    <TableCell><span className={ml.color}>{ml.label}</span></TableCell>
                    <TableCell className={`text-right font-mono ${Number(m.quantity) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {Number(m.quantity) >= 0 ? "+" : ""}{Number(m.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.notes || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {movements.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun mouvement</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Tab: Achats */}
        <TabsContent value="achats" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => router.push("/stock/commande/nouvelle")}>
              <ShoppingCart className="mr-2 h-4 w-4" />Nouveau bon de commande
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Total HT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((po) => {
                const ps = PO_STATUS_LABELS[po.status] || { label: po.status, variant: "outline" as const };
                return (
                  <TableRow key={po.id} className="cursor-pointer" onClick={() => router.push(`/stock/commande/${po.id}`)}>
                    <TableCell>{format(new Date(po.order_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{po.supplier_name}</TableCell>
                    <TableCell><Badge variant={ps.variant}>{ps.label}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{Number(po.total_ht).toFixed(2)} €</TableCell>
                  </TableRow>
                );
              })}
              {purchaseOrders.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun bon de commande</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <StockItemForm open={store.stockItemFormOpen} onOpenChange={store.setStockItemFormOpen} item={editingItem}
        onSubmit={editingItem ? handleUpdateItem : handleCreateItem} />
      <MovementForm open={store.movementFormOpen} onOpenChange={store.setMovementFormOpen} stockItems={items}
        onSubmit={handleMovement} />
      <InventoryImportDialog open={store.importDialogOpen} onOpenChange={store.setImportDialogOpen}
        onMatchNames={matchStockItemsByName} onSubmit={processInventory} />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360
npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/stock/page.tsx
git commit -m "feat(m05): implement stock main page with 3 tabs (inventory, movements, purchases)"
```

---

## Task 18: M05 Purchase Order Creation Page

**Files:**
- Create: `src/app/(dashboard)/stock/commande/nouvelle/page.tsx`

- [ ] **Step 1: Create the purchase order creation page**

This page allows selecting a supplier (or pre-filled via `?supplier=`), shows suggested low-stock items, and lets Pascal add items manually. Full code provided in implementation — follows the same patterns as `/commandes/nouvelle`.

The key elements:
- `useSearchParams()` wrapped in `Suspense` boundary for `?supplier=` param
- Supplier select dropdown (loads from `getSuppliers` action in fournisseurs)
- Auto-suggested items via `getSuggestedPurchaseItems` when supplier selected
- Manual add from stock items list
- Editable quantity and price per line
- Total HT calculation
- Save as draft or send directly

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/stock/commande/nouvelle/page.tsx
git commit -m "feat(m05): add purchase order creation page with auto-suggestions"
```

---

## Task 19: M05 Purchase Order Detail Page

**Files:**
- Create: `src/app/(dashboard)/stock/commande/[id]/page.tsx`

- [ ] **Step 1: Create the purchase order detail + receiving page**

This page shows PO details, allows receiving items (quantity received inputs per line), and handles status transitions (send, receive, cancel). Follows pattern of supplier detail page.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/stock/commande/\[id\]/page.tsx
git commit -m "feat(m05): add purchase order detail page with receiving workflow"
```

---

## Task 20: M05 Inventory Count Page

**Files:**
- Create: `src/app/(dashboard)/stock/inventaire/page.tsx`

- [ ] **Step 1: Create the manual inventory count page**

Editable table of all stock items with current quantity vs counted quantity, category filter, and submit button that generates inventory movements.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/stock/inventaire/page.tsx
git commit -m "feat(m05): add manual inventory count page"
```

---

## Task 21: M05 Seed Stock Data for LCQF

- [ ] **Step 1: Insert seed stock items via Supabase MCP `execute_sql`**

```sql
INSERT INTO stock_items (restaurant_id, name, category, unit, current_quantity, alert_threshold, optimal_quantity, tracking_mode, unit_cost) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Entrecôte', 'viandes', 'kg', 12.5, 5, 20, 'ingredient', 32.50),
  ('a0000000-0000-0000-0000-000000000001', 'Poitrine fumée', 'viandes', 'kg', 8.0, 3, 15, 'ingredient', 8.90),
  ('a0000000-0000-0000-0000-000000000001', 'Travers de porc', 'viandes', 'kg', 6.0, 4, 12, 'ingredient', 7.50),
  ('a0000000-0000-0000-0000-000000000001', 'Pain burger', 'épicerie', 'pack', 3, 2, 6, 'lot', 4.50),
  ('a0000000-0000-0000-0000-000000000001', 'Cheddar', 'produits_laitiers', 'kg', 2.5, 1, 5, 'ingredient', 12.80),
  ('a0000000-0000-0000-0000-000000000001', 'Sauce BBQ', 'épicerie', 'L', 4, 2, 8, 'lot', 6.20),
  ('a0000000-0000-0000-0000-000000000001', 'Tomates', 'légumes', 'kg', 3.0, 2, 8, 'lot', 3.20),
  ('a0000000-0000-0000-0000-000000000001', 'Salade batavia', 'légumes', 'piece', 8, 5, 15, 'lot', 0.90),
  ('a0000000-0000-0000-0000-000000000001', 'Oignons rouges', 'légumes', 'kg', 1.5, 1, 4, 'lot', 2.10),
  ('a0000000-0000-0000-0000-000000000001', 'Coca-Cola 33cl', 'boissons', 'pack', 5, 3, 10, 'lot', 14.40);
```

- [ ] **Step 2: Verify data**

```sql
SELECT name, category, current_quantity, unit, tracking_mode FROM stock_items
WHERE restaurant_id = 'a0000000-0000-0000-0000-000000000001' ORDER BY category, name;
```

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat(m05): seed LCQF stock data (10 articles)"
```

---

## Task 22: Integration — Update Sidebar Active States

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Update sidebar to highlight sub-routes**

Change the `isActive` check from exact match to prefix match for stock and fournisseurs routes:

In `app-sidebar.tsx`, change:
```typescript
isActive={pathname === item.href}
```
to:
```typescript
isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
```

This ensures `/stock/commande/nouvelle` and `/fournisseurs/abc-123` highlight the parent nav item.

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "fix(layout): highlight sidebar for sub-routes (stock/commande, fournisseurs/[id])"
```

---

## Task 23: Integration — Regenerate Types & Verify Build

- [ ] **Step 1: Regenerate Supabase types**

```bash
cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360
npx supabase gen types typescript --project-id vymwkwziytcetjlvtbcc > src/types/database.types.ts
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit --pretty
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Fix any errors that arise.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(m05-m06): final type generation and build verification"
```

---

## Task 24: Manual Testing Checklist

- [ ] **Step 1: Test M06 Fournisseurs**
  - Navigate to `/fournisseurs`
  - Verify 5 seeded suppliers appear
  - Create a new supplier
  - Click a supplier card to navigate to detail
  - Add a catalog item
  - Edit and delete a catalog item
  - Toggle supplier active/inactive
  - Search and filter work

- [ ] **Step 2: Test M05 Stock — Inventaire tab**
  - Navigate to `/stock`
  - Verify 10 seeded items appear with status badges
  - Create a new stock item
  - Edit an existing item
  - Filter by status (OK/Bas/Critique)
  - Download template Excel
  - Import an Excel file (use the template)

- [ ] **Step 3: Test M05 Stock — Mouvements tab**
  - Switch to Mouvements tab
  - Create a manual movement (adjustment)
  - Verify quantity updated on Inventaire tab
  - Create a waste movement, verify negative quantity

- [ ] **Step 4: Test M05 Stock — Achats tab**
  - Navigate to `/stock/commande/nouvelle`
  - Select a supplier
  - Verify suggestions appear for low-stock items
  - Add items, save as draft
  - Navigate to detail page, send the order
  - Receive items, verify stock quantities updated

- [ ] **Step 5: Commit final state**

```bash
git add .
git commit -m "feat(m05-m06): modules Fournisseurs et Stock & Achats complets"
```
