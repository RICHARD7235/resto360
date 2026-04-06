"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Tables, Database } from "@/types/database.types";
import {
  createPreparationTickets,
  addItemsToPreparationTickets,
} from "@/lib/preparation-tickets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderRow = Tables<"orders">;
type OrderItemRow = Tables<"order_items">;
type ProductRow = Tables<"products">;
type MenuCategoryRow = Tables<"menu_categories">;
type MenuRow = Tables<"menus">;
type MenuItemRow = Tables<"menu_items">;

export type OrderStatus =
  | "draft"
  | "sent"
  | "preparing"
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

export interface MenuItemWithProduct extends MenuItemRow {
  product?: ProductRow | null;
}

export interface MenuWithItems extends MenuRow {
  items: MenuItemWithProduct[];
}

interface OrderItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  menu_id?: string;
  menu_name?: string;
  is_menu_header?: boolean;
  real_menu_id?: string;
}

export interface OrderStats {
  totalOrders: number;
  revenue: number;
  activeOrders: number;
  completedOrders: number;
}

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
    .in("status", ["sent", "preparing", "ready"])
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

  const activeStatuses: OrderStatus[] = ["sent", "preparing", "ready"];
  const completedStatuses: OrderStatus[] = ["served", "paid"];

  let revenue = 0;
  let activeOrders = 0;
  let completedOrders = 0;

  for (const row of rows) {
    const status = (row.status ?? "draft") as OrderStatus;
    revenue += row.total ?? 0;

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
// Menus for order
// ---------------------------------------------------------------------------

export async function getMenusForOrder(): Promise<MenuWithItems[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: menus, error: menusError } = await supabase
    .from("menus")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  if (menusError) throw new Error(`Erreur menus: ${menusError.message}`);
  if (!menus || menus.length === 0) return [];

  const menuIds = menus.map((m) => m.id);
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .in("menu_id", menuIds)
    .order("sort_order", { ascending: true });

  const productIds = (menuItems ?? [])
    .map((mi) => mi.product_id)
    .filter((id): id is string => id !== null);
  let products: ProductRow[] = [];
  if (productIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);
    products = data ?? [];
  }

  return menus.map((menu) => ({
    ...menu,
    items: (menuItems ?? [])
      .filter((mi) => mi.menu_id === menu.id)
      .map((mi) => ({
        ...mi,
        product: products.find((p) => p.id === mi.product_id) ?? null,
      })),
  }));
}

// ---------------------------------------------------------------------------
// Reservations for floor plan
// ---------------------------------------------------------------------------

export interface FloorPlanReservation {
  id: string;
  customer_name: string;
  party_size: number;
  time: string;
  table_number: string;
  status: string;
}

export async function getTodayReservationsForFloorPlan(): Promise<FloorPlanReservation[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("reservations")
    .select("id, customer_name, party_size, time, table_number, status")
    .eq("restaurant_id", restaurantId)
    .eq("date", today)
    .in("status", ["confirmed", "seated", "pending"])
    .not("table_number", "is", null);

  if (error) {
    throw new Error(`Erreur chargement réservations: ${error.message}`);
  }

  return (data ?? []).filter(
    (r): r is FloorPlanReservation => r.table_number !== null
  );
}

// ---------------------------------------------------------------------------
// Preparation tickets
// ---------------------------------------------------------------------------

export async function getPreparationTickets(
  stationId?: string
): Promise<PreparationTicketWithItems[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  const { data: orders } = await supabase
    .from("orders")
    .select("id, table_number, notes")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", today)
    .in("status", ["sent", "preparing", "ready"]);

  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  let ticketQuery = supabase
    .from("preparation_tickets")
    .select("*")
    .in("order_id", orderIds)
    .in("status", ["sent", "preparing", "ready"])
    .order("created_at", { ascending: true });

  if (stationId) {
    ticketQuery = ticketQuery.eq("station_id", stationId);
  }

  const { data: tickets } = await ticketQuery;
  if (!tickets || tickets.length === 0) return [];

  const stationIds = [...new Set(tickets.map((t) => t.station_id))];
  const { data: stations } = await supabase
    .from("preparation_stations")
    .select("id, name, color")
    .in("id", stationIds);

  const stationMap = new Map(
    (stations ?? []).map((s) => [s.id, { name: s.name, color: s.color ?? "#6B7280" }])
  );

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
    orderStatus = "preparing";
  } else {
    orderStatus = "sent";
  }

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
      status: "sent",
      total,
    })
    .select()
    .single();

  if (orderError) {
    console.error("createOrder: order insert failed", orderError);
    throw new Error(
      `Erreur lors de la création de la commande : ${orderError.message}`
    );
  }

  // Insert order items
  // Menu headers have synthetic product_ids (not real UUIDs) — set to null
  const itemsToInsert = data.items.map((item) => ({
    order_id: order.id,
    product_id: item.is_menu_header ? null : item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    notes: item.notes ?? null,
    status: "pending" as const,
    menu_id: item.real_menu_id ?? null,
    menu_name: item.menu_name ?? null,
  }));

  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsToInsert)
    .select();

  if (itemsError) {
    console.error("createOrder: items insert failed", itemsError, JSON.stringify(itemsToInsert));
    // Rollback: delete the order if items insertion fails
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error(
      `Erreur lors de l'ajout des articles : ${itemsError.message}`
    );
  }

  // Create preparation tickets (split by station)
  // Skip menu header items (product_id = null) — they are for billing only
  const itemsForTickets = (orderItems ?? [])
    .filter((item) => item.product_id !== null)
    .map((item) => ({
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
    product_id: item.is_menu_header ? null : item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    notes: item.notes ?? null,
    status: "pending" as const,
    menu_id: item.real_menu_id ?? null,
    menu_name: item.menu_name ?? null,
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
