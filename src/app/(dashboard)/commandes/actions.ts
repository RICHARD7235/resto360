"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Tables, Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderRow = Tables<"orders">;
type OrderItemRow = Tables<"order_items">;
type ProductRow = Tables<"products">;
type MenuCategoryRow = Tables<"menu_categories">;

export type OrderStatus =
  | "pending"
  | "in_progress"
  | "ready"
  | "served"
  | "paid"
  | "cancelled";

export type OrderItemStatus = "pending" | "in_progress" | "ready" | "served";

export interface OrderFilters {
  status?: OrderStatus[];
  dateFrom?: string; // ISO date string (YYYY-MM-DD)
  dateTo?: string;
}

export interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
}

interface OrderItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface OrderStats {
  totalOrders: number;
  revenue: number;
  activeOrders: number;
  completedOrders: number;
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

export async function getOrders(
  filters: OrderFilters = {}
): Promise<(OrderRow & { items_count: number })[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lt("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Erreur lors du chargement des commandes : ${error.message}`
    );
  }

  // Fetch item counts separately (no FK relation in generated types)
  const orderIds = (data ?? []).map((o) => o.id);
  let itemCounts: Record<string, number> = {};

  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("order_id")
      .in("order_id", orderIds);

    for (const item of items ?? []) {
      itemCounts[item.order_id] = (itemCounts[item.order_id] ?? 0) + 1;
    }
  }

  return (data ?? []).map((order) => ({
    ...order,
    items_count: itemCounts[order.id] ?? 0,
  }));
}

export async function getOrder(id: string): Promise<OrderWithItems | null> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(
      `Erreur lors du chargement de la commande : ${error.message}`
    );
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  return { ...order, order_items: items ?? [] };
}

export async function getActiveOrders(): Promise<OrderWithItems[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", today)
    .in("status", ["pending", "in_progress", "ready"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des commandes actives : ${error.message}`
    );
  }

  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  const itemsByOrder: Record<string, OrderItemRow[]> = {};
  for (const item of items ?? []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  }

  return orders.map((order) => ({
    ...order,
    order_items: itemsByOrder[order.id] ?? [],
  }));
}

export async function getMenuCategories(): Promise<MenuCategoryRow[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des catégories : ${error.message}`
    );
  }

  return data ?? [];
}

export async function getProducts(
  categoryId?: string
): Promise<ProductRow[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Erreur lors du chargement des produits : ${error.message}`
    );
  }

  return data ?? [];
}

export async function getOrderStats(date: string): Promise<OrderStats> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("status, total")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", date)
    .lt("created_at", `${date}T23:59:59.999Z`);

  if (error) {
    throw new Error(
      `Erreur lors du chargement des statistiques : ${error.message}`
    );
  }

  const rows = data ?? [];

  const activeStatuses: OrderStatus[] = ["pending", "in_progress", "ready"];
  const completedStatuses: OrderStatus[] = ["served", "paid"];

  let revenue = 0;
  let activeOrders = 0;
  let completedOrders = 0;

  for (const row of rows) {
    const status = row.status as OrderStatus;
    revenue += row.total;

    if (activeStatuses.includes(status)) {
      activeOrders++;
    } else if (completedStatuses.includes(status)) {
      completedOrders++;
    }
  }

  return {
    totalOrders: rows.length,
    revenue,
    activeOrders,
    completedOrders,
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createOrder(data: {
  table_number: string;
  notes?: string;
  items: OrderItemInput[];
}): Promise<OrderWithItems> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Calculate total server-side
  const total = data.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      restaurant_id: restaurantId,
      table_number: data.table_number,
      notes: data.notes ?? null,
      status: "pending",
      total,
    })
    .select()
    .single();

  if (orderError) {
    throw new Error(
      `Erreur lors de la création de la commande : ${orderError.message}`
    );
  }

  // Insert order items
  const itemsToInsert = data.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    notes: item.notes ?? null,
    status: "pending" as const,
  }));

  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsToInsert)
    .select();

  if (itemsError) {
    // Rollback: delete the order if items insertion fails
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error(
      `Erreur lors de l'ajout des articles : ${itemsError.message}`
    );
  }

  return { ...order, order_items: orderItems ?? [] };
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<OrderRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la mise à jour du statut : ${error.message}`
    );
  }

  return order;
}

export async function updateOrderItemStatus(
  id: string,
  status: OrderItemStatus
): Promise<OrderItemRow> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Verify the item belongs to an order from this restaurant
  const { data: item, error: fetchError } = await supabase
    .from("order_items")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(
      `Erreur lors de la récupération de l'article : ${fetchError.message}`
    );
  }

  // Check that the parent order belongs to this restaurant
  const { data: parentOrder } = await supabase
    .from("orders")
    .select("restaurant_id")
    .eq("id", item.order_id)
    .single();

  if (parentOrder?.restaurant_id !== restaurantId) {
    throw new Error("Article non trouvé.");
  }

  const { data: updated, error } = await supabase
    .from("order_items")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la mise à jour de l'article : ${error.message}`
    );
  }

  return updated;
}

export async function addItemsToOrder(
  orderId: string,
  items: OrderItemInput[]
): Promise<OrderWithItems> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Verify order belongs to this restaurant
  const { data: existingOrder, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (orderError || !existingOrder) {
    throw new Error("Commande non trouvée.");
  }

  // Insert new items
  const itemsToInsert = items.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    notes: item.notes ?? null,
    status: "pending" as const,
  }));

  const { error: insertError } = await supabase
    .from("order_items")
    .insert(itemsToInsert);

  if (insertError) {
    throw new Error(
      `Erreur lors de l'ajout des articles : ${insertError.message}`
    );
  }

  // Recalculate total from all items
  const { data: allItems, error: fetchError } = await supabase
    .from("order_items")
    .select("quantity, unit_price")
    .eq("order_id", orderId);

  if (fetchError) {
    throw new Error(
      `Erreur lors du recalcul du total : ${fetchError.message}`
    );
  }

  const newTotal = (allItems ?? []).reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  // Update order total
  const { error: updateError } = await supabase
    .from("orders")
    .update({ total: newTotal, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateError) {
    throw new Error(
      `Erreur lors de la mise à jour du total : ${updateError.message}`
    );
  }

  // Return full order with items
  const result = await getOrder(orderId);
  if (!result) {
    throw new Error("Commande non trouvée après mise à jour.");
  }

  return result;
}

export async function deleteOrder(id: string): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Delete items first (cascade may not be set up)
  const { error: itemsError } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", id);

  if (itemsError) {
    throw new Error(
      `Erreur lors de la suppression des articles : ${itemsError.message}`
    );
  }

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(
      `Erreur lors de la suppression de la commande : ${error.message}`
    );
  }
}
