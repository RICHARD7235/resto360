"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/rbac";
import type { Tables, Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const supplierSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  contact_name: z.string().max(200).optional().nullable(),
  is_active: z.boolean().optional(),
});

const catalogItemSchema = z.object({
  label: z.string().min(1).max(200),
  unit: z.string().min(1),
  unit_price: z.number().min(0),
  category: z.string().max(100).optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  is_available: z.boolean().optional(),
});

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
// Queries
// ---------------------------------------------------------------------------

export async function getSuppliers(
  filters: SupplierFilters = {}
): Promise<SupplierWithCatalogCount[]> {
  const { restaurantId } = await requireActionPermission("m06_fournisseurs", "read");
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
  const { restaurantId } = await requireActionPermission("m06_fournisseurs", "read");
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
  const { restaurantId } = await requireActionPermission("m06_fournisseurs", "read");
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
  const { restaurantId } = await requireActionPermission("m06_fournisseurs", "write");
  const supabase = await createClient();

  supplierSchema.parse(data);

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
  const { restaurantId } = await requireActionPermission("m06_fournisseurs", "write");
  const supabase = await createClient();

  supplierSchema.partial().parse(data);

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
  const { restaurantId } = await requireActionPermission("m06_fournisseurs", "write");
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
  const { restaurantId } = await requireActionPermission("m06_fournisseurs", "write");
  const supabase = await createClient();

  // Verify supplier belongs to this restaurant
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", supplierId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!supplier) throw new Error("Fournisseur introuvable.");

  catalogItemSchema.parse(data);

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
  const { restaurantId } = await requireActionPermission("m06_fournisseurs", "write");
  const supabase = await createClient();

  // Verify catalog item belongs to a supplier of this restaurant
  const { data: catalogItem } = await supabase
    .from("supplier_catalog_items")
    .select("supplier_id")
    .eq("id", id)
    .single();

  if (!catalogItem) throw new Error("Article introuvable.");

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", catalogItem.supplier_id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!supplier) throw new Error("Fournisseur introuvable.");

  catalogItemSchema.partial().parse(data);

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
  const { restaurantId } = await requireActionPermission("m06_fournisseurs", "delete");
  const supabase = await createClient();

  // Verify catalog item belongs to a supplier of this restaurant
  const { data: catalogItem } = await supabase
    .from("supplier_catalog_items")
    .select("supplier_id")
    .eq("id", id)
    .single();

  if (!catalogItem) throw new Error("Article introuvable.");

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", catalogItem.supplier_id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!supplier) throw new Error("Fournisseur introuvable.");

  const { error } = await supabase
    .from("supplier_catalog_items")
    .delete()
    .eq("id", id);

  if (error) throw new Error("Impossible de supprimer l'article.");
}
