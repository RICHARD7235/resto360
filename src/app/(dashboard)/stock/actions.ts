"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/rbac";
import type { Tables, Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const stockItemSchema = z.object({
  name: z.string().min(1).max(200),
  unit: z.string().min(1),
  category: z.string().max(100).optional().nullable(),
  current_quantity: z.number().min(0),
  alert_threshold: z.number().min(0).optional().nullable(),
  optimal_quantity: z.number().min(0).optional().nullable(),
  unit_cost: z.number().min(0).optional().nullable(),
  tracking_mode: z.enum(["ingredient", "lot"]).optional(),
  is_active: z.boolean().optional(),
});

const manualMovementSchema = z.object({
  stock_item_id: z.string().uuid(),
  type: z.enum(["purchase", "consumption", "adjustment", "waste", "return", "inventory"]),
  quantity: z.number(),
  notes: z.string().max(500).optional(),
});

const purchaseOrderItemSchema = z.object({
  stock_item_id: z.string().uuid(),
  quantity: z.number().min(0.01),
  unit_price: z.number().min(0),
  catalog_item_id: z.string().uuid().optional(),
});

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
  const { restaurantId } = await requireActionPermission("m05_stock", "read");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "read");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "read");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "read");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "write");
  const supabase = await createClient();

  stockItemSchema.parse(data);

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
  const { restaurantId } = await requireActionPermission("m05_stock", "write");
  const supabase = await createClient();

  stockItemSchema.partial().parse(data);

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
  const { restaurantId } = await requireActionPermission("m05_stock", "read");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "write");
  const supabase = await createClient();

  manualMovementSchema.parse(data);

  const { data: { user } } = await supabase.auth.getUser();

  // Atomic stock adjustment via RPC — eliminates read-then-write race condition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (supabase.rpc as any)(
    "adjust_stock_quantity",
    {
      p_stock_item_id: data.stock_item_id,
      p_restaurant_id: restaurantId,
      p_delta: data.quantity,
      p_movement_type: data.type,
      p_reference_type: "manual",
      p_reference_id: null,
      p_notes: data.notes || null,
      p_user_id: user!.id,
      p_unit_cost: null,
    }
  );

  if (rpcError) {
    throw new Error(
      rpcError.message?.includes("not found")
        ? "Article introuvable."
        : "Impossible de créer le mouvement."
    );
  }

  // Fetch the movement that was just created for the return value
  const { data: movement, error: fetchError } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("stock_item_id", data.stock_item_id)
    .eq("type", data.type)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !movement) {
    throw new Error("Mouvement créé mais impossible de le récupérer.");
  }

  return movement;
}

export async function processInventory(
  lines: InventoryLine[]
): Promise<{ updated: number; created: number }> {
  const { restaurantId } = await requireActionPermission("m05_stock", "write");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "read");
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

  // Get supplier names (filtered by restaurant for tenant safety)
  const supplierIds = [...new Set((orders || []).map((o) => o.supplier_id))];
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name")
    .in("id", supplierIds)
    .eq("restaurant_id", restaurantId);

  const supplierMap = new Map((suppliers || []).map((s) => [s.id, s.name]));

  return (orders || []).map((o) => ({
    ...o,
    supplier_name: supplierMap.get(o.supplier_id) || "Inconnu",
  }));
}

export async function getPurchaseOrder(
  id: string
): Promise<PurchaseOrderDetail> {
  const { restaurantId } = await requireActionPermission("m05_stock", "read");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "write");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  z.string().uuid().parse(supplierId);
  z.array(purchaseOrderItemSchema).min(1).parse(items);

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
  const { restaurantId } = await requireActionPermission("m05_stock", "write");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "write");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "write");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify the purchase order belongs to this restaurant before processing items
  const { data: poCheck } = await supabase
    .from("purchase_orders")
    .select("id")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!poCheck) throw new Error("Bon de commande introuvable.");

  // Update each PO item and adjust stock atomically via RPC
  for (const received of receivedItems) {
    const { data: poItem } = await supabase
      .from("purchase_order_items")
      .select("*, purchase_order_id")
      .eq("id", received.item_id)
      .eq("purchase_order_id", id)
      .single();

    if (!poItem) continue;

    // Update received quantity on PO item
    await supabase
      .from("purchase_order_items")
      .update({ quantity_received: received.quantity_received })
      .eq("id", received.item_id);

    // Atomic stock adjustment + movement via RPC
    if (received.quantity_received > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase.rpc as any)(
        "adjust_stock_quantity",
        {
          p_stock_item_id: poItem.stock_item_id,
          p_restaurant_id: restaurantId,
          p_delta: received.quantity_received,
          p_movement_type: "purchase",
          p_reference_type: "purchase_order",
          p_reference_id: id,
          p_notes: null,
          p_user_id: user!.id,
          p_unit_cost: Number(poItem.unit_price),
        }
      );

      if (rpcError) {
        console.error(`RPC adjust_stock_quantity failed for item ${poItem.stock_item_id}:`, rpcError);
        // Non-blocking: continue processing remaining items
      }

      // Also update unit_cost on the stock item (not handled by RPC)
      await supabase
        .from("stock_items")
        .update({ unit_cost: Number(poItem.unit_price) })
        .eq("id", poItem.stock_item_id);
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
  const { restaurantId } = await requireActionPermission("m05_stock", "read");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "read");
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
  const { restaurantId } = await requireActionPermission("m05_stock", "read");
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
