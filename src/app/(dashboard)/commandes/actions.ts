"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Tables, Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createPreparationTickets,
  addItemsToPreparationTickets,
} from "@/lib/preparation-tickets";

// ---------------------------------------------------------------------------
// Untyped Supabase client (restaurant_tables not yet in generated types)
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function createUntypedClient(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

// P1-8: Use local France timezone to avoid UTC date boundary issues
// (e.g. 00:30 CEST = 22:30 UTC the day before)
function getTodayDateString(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  // sv-SE locale returns YYYY-MM-DD format
}

// ---------------------------------------------------------------------------
// Course resolution
// ---------------------------------------------------------------------------

const COURSE_LABELS: Record<number, string> = {
  0: "Immediat",
  1: "Entrees",
  2: "Plats",
  3: "Desserts",
};

function getCourseLabel(course: number): string {
  return COURSE_LABELS[course] ?? `Service ${course}`;
}

/**
 * Resolves course_number for each item based on product → category → default_course.
 * For takeaway/delivery, all items are course 0 (no sequencing).
 */
async function resolveCourseNumbers(
  productIds: (string | null)[],
  orderType: OrderType
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  // Takeaway/delivery: everything is course 0
  if (orderType === "takeaway" || orderType === "delivery") {
    for (const id of productIds) {
      if (id) result.set(id, 0);
    }
    return result;
  }

  const uniqueIds = [...new Set(productIds.filter((id): id is string => id !== null))];
  if (uniqueIds.length === 0) return result;

  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, category_id")
    .in("id", uniqueIds);

  if (!products) return result;

  const categoryIds = products
    .map((p) => p.category_id)
    .filter((id): id is string => id !== null)
    .filter((id, i, arr) => arr.indexOf(id) === i);

  const courseByCategory = new Map<string, number>();
  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("id, default_course")
      .in("id", categoryIds);

    for (const cat of categories ?? []) {
      courseByCategory.set(cat.id, cat.default_course ?? 1);
    }
  }

  for (const product of products) {
    const course = product.category_id
      ? courseByCategory.get(product.category_id) ?? 1
      : 1;
    result.set(product.id, course);
  }

  return result;
}

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

export type OrderItemStatus = "pending" | "in_progress" | "ready" | "served" | "cancelled";

export type OrderType = "dine_in" | "takeaway" | "delivery";

export type PaymentMethod = "cash" | "card" | "check" | "ticket_restaurant" | "other";

export interface OrderFilters {
  status?: OrderStatus[];
  dateFrom?: string; // ISO date string (YYYY-MM-DD)
  dateTo?: string;
}

// P1-9: order_type, paid_amount, customer_name, payment_id etc.
// are already in generated types (Tables<"orders"> / Tables<"order_items">).
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
  breakdown: {
    dine_in: { count: number; revenue: number };
    takeaway: { count: number; revenue: number };
    delivery: { count: number; revenue: number };
  };
}

export interface OrderPayment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  label: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrderCancellation {
  id: string;
  order_id: string;
  order_item_id: string | null;
  reason: string;
  cancelled_by: string | null;
  cancelled_at: string;
  // Joined fields
  table_number: string | null;
  product_name: string | null;
  cancelled_by_name: string | null;
  order_type: string;
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
  course_number: number;
  table_number: string | null;
  order_notes: string | null;
  order_type: OrderType;
  customer_name: string | null;
  delivery_address: string | null;
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

async function getUserContext(): Promise<{
  userId: string;
  restaurantId: string;
  role: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.restaurant_id) {
    throw new Error("Aucun restaurant associé à votre compte.");
  }

  return {
    userId: user.id,
    restaurantId: profile.restaurant_id,
    role: (profile.role as string) ?? "staff",
  };
}

// ---------------------------------------------------------------------------
// Exposed helper for client-side Realtime filter
// ---------------------------------------------------------------------------

export async function getRestaurantId(): Promise<string> {
  return getUserRestaurantId();
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

  const today = getTodayDateString();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", today)
    .in("status", ["sent", "preparing", "ready", "served", "paid"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des commandes actives : ${error.message}`
    );
  }

  if (!orders || orders.length === 0) return [];

  // Exclude paid orders that have been cleared (table already freed by staff)
  const activeOrders = orders.filter(
    (o) => o.status !== "paid" || !o.cleared_at
  );

  if (activeOrders.length === 0) return [];

  const orderIds = activeOrders.map((o) => o.id);
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  const itemsByOrder: Record<string, OrderItemRow[]> = {};
  for (const item of items ?? []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  }

  return activeOrders.map((order) => ({
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("orders")
    .select("status, total, order_type")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", date)
    .lt("created_at", `${date}T23:59:59.999Z`);

  if (error) {
    throw new Error(
      `Erreur lors du chargement des statistiques : ${error.message}`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as { status: string | null; total: number | null; order_type: string }[];

  const activeStatuses: OrderStatus[] = ["sent", "preparing", "ready"];
  const completedStatuses: OrderStatus[] = ["served", "paid"];

  let revenue = 0;
  let activeOrders = 0;
  let completedOrders = 0;

  const breakdown = {
    dine_in: { count: 0, revenue: 0 },
    takeaway: { count: 0, revenue: 0 },
    delivery: { count: 0, revenue: 0 },
  };

  for (const row of rows) {
    const status = (row.status ?? "draft") as OrderStatus;
    const total = row.total ?? 0;
    revenue += total;

    if (activeStatuses.includes(status)) {
      activeOrders++;
    } else if (completedStatuses.includes(status)) {
      completedOrders++;
    }

    const orderType = (row.order_type ?? "dine_in") as OrderType;
    if (orderType in breakdown) {
      breakdown[orderType].count++;
      breakdown[orderType].revenue += total;
    }
  }

  return {
    totalOrders: rows.length,
    revenue,
    activeOrders,
    completedOrders,
    breakdown,
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

  const today = getTodayDateString();

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

  const today = getTodayDateString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawOrders } = await (supabase as any)
    .from("orders")
    .select("id, table_number, notes, order_type, customer_name, delivery_address")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", today)
    .in("status", ["sent", "preparing", "ready", "served"]);

  const orders = (rawOrders ?? []) as {
    id: string;
    table_number: string | null;
    notes: string | null;
    order_type: string;
    customer_name: string | null;
    delivery_address: string | null;
  }[];

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  let ticketQuery = supabase
    .from("preparation_tickets")
    .select("*")
    .in("order_id", orderIds)
    .in("status", ["pending", "in_progress", "ready"])
    .not("fired_at", "is", null)
    .order("course_number", { ascending: true })
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
      course_number: ticket.course_number ?? 1,
      table_number: order?.table_number ?? null,
      order_notes: order?.notes ?? null,
      order_type: (order?.order_type ?? "dine_in") as OrderType,
      customer_name: order?.customer_name ?? null,
      delivery_address: order?.delivery_address ?? null,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as any)
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
    .select("status, fired_at")
    .eq("order_id", ticket.order_id);

  if (!allTickets || allTickets.length === 0) return;

  const firedTickets = allTickets.filter((t) => t.fired_at !== null);
  const holdTickets = allTickets.filter((t) => t.fired_at === null);
  const firedStatuses = firedTickets.map((t) => t.status ?? "pending");

  let orderStatus: OrderStatus;
  if (firedStatuses.every((s) => s === "served") && holdTickets.length === 0) {
    orderStatus = "served";
  } else if (firedStatuses.every((s) => s === "ready" || s === "served")) {
    orderStatus = "ready";
  } else if (firedStatuses.some((s) => s === "in_progress")) {
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
// Course firing
// ---------------------------------------------------------------------------

export async function fireNextCourse(orderId: string): Promise<{ firedCourse: number } | null> {
  const { restaurantId, role } = await getUserContext();
  const supabase = await createClient();

  // RBAC: only salle roles can fire
  if (!["owner", "admin", "manager", "staff"].includes(role)) {
    throw new Error("Seule la salle peut envoyer le service suivant.");
  }

  // Verify order belongs to restaurant
  const { data: order } = await supabase
    .from("orders")
    .select("id, restaurant_id")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!order) {
    throw new Error("Commande non trouvee.");
  }

  // Find the smallest held course
  const { data: heldTickets } = await supabase
    .from("preparation_tickets")
    .select("id, course_number")
    .eq("order_id", orderId)
    .is("fired_at", null)
    .order("course_number", { ascending: true });

  if (!heldTickets || heldTickets.length === 0) {
    return null; // Nothing to fire
  }

  const nextCourse = heldTickets[0].course_number ?? 1;
  const ticketsToFire = heldTickets.filter((t) => (t.course_number ?? 1) === nextCourse);

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("preparation_tickets")
    .update({ fired_at: now })
    .in("id", ticketsToFire.map((t) => t.id));

  if (error) {
    throw new Error(`Erreur envoi service: ${error.message}`);
  }

  return { firedCourse: nextCourse };
}

export async function getOrderCourseStatus(orderId: string): Promise<{
  courses: { course_number: number; label: string; status: "hold" | "fired" | "ready" | "served"; ticketCount: number }[];
  nextFireableCourse: number | null;
}> {
  await getUserRestaurantId();
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("preparation_tickets")
    .select("course_number, status, fired_at")
    .eq("order_id", orderId);

  if (!tickets || tickets.length === 0) {
    return { courses: [], nextFireableCourse: null };
  }

  // Group by course
  const byCourse = new Map<number, typeof tickets>();
  for (const t of tickets) {
    const c = t.course_number ?? 1;
    const arr = byCourse.get(c) ?? [];
    arr.push(t);
    byCourse.set(c, arr);
  }

  const courses = [...byCourse.entries()]
    .sort(([a], [b]) => a - b)
    .map(([courseNum, courseTickets]) => {
      const allFired = courseTickets.every((t) => t.fired_at !== null);
      const statuses = courseTickets.map((t) => t.status ?? "pending");

      let status: "hold" | "fired" | "ready" | "served";
      if (!allFired) {
        status = "hold";
      } else if (statuses.every((s) => s === "served")) {
        status = "served";
      } else if (statuses.every((s) => s === "ready" || s === "served")) {
        status = "ready";
      } else {
        status = "fired";
      }

      return {
        course_number: courseNum,
        label: getCourseLabel(courseNum),
        status,
        ticketCount: courseTickets.length,
      };
    });

  // Next fireable = smallest held course, but only if all fired non-zero courses are ready/served
  // Course 0 (drinks, menu headers) is independent and never blocks firing
  const firedNonZero = courses.filter((c) => c.status !== "hold" && c.course_number > 0);
  const allFiredDone = firedNonZero.length === 0 || firedNonZero.every((c) => c.status === "ready" || c.status === "served");
  const heldCourses = courses.filter((c) => c.status === "hold");
  const nextFireableCourse = allFiredDone && heldCourses.length > 0
    ? heldCourses[0].course_number
    : null;

  return { courses, nextFireableCourse };
}

// ---------------------------------------------------------------------------
// Table clearing
// ---------------------------------------------------------------------------

export async function clearTable(orderId: string): Promise<void> {
  const { restaurantId, role } = await getUserContext();
  const supabase = await createClient();

  if (!["owner", "admin", "manager", "staff"].includes(role)) {
    throw new Error("Vous n'avez pas les droits pour liberer la table.");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, restaurant_id, status")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!order) {
    throw new Error("Commande non trouvee.");
  }

  if (order.status !== "paid") {
    throw new Error("La commande doit etre payee avant de liberer la table.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("orders")
    .update({ cleared_at: new Date().toISOString() })
    .eq("id", orderId);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createOrder(data: {
  table_number?: string;
  notes?: string;
  items: OrderItemInput[];
  order_type?: OrderType;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
}): Promise<OrderWithItems> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const orderType = data.order_type ?? "dine_in";

  // Validation based on order type
  if (orderType === "takeaway" && !data.customer_name?.trim()) {
    throw new Error("Le nom du client est requis pour une commande à emporter.");
  }
  if (orderType === "delivery") {
    if (!data.customer_name?.trim()) {
      throw new Error("Le nom du client est requis pour une livraison.");
    }
    if (!data.customer_phone?.trim()) {
      throw new Error("Le téléphone est requis pour une livraison.");
    }
    if (!data.delivery_address?.trim()) {
      throw new Error("L'adresse de livraison est requise.");
    }
  }

  // Calculate total server-side
  const total = data.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  // Insert order with new fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertPayload: Record<string, unknown> = {
    restaurant_id: restaurantId,
    table_number: orderType === "dine_in" ? (data.table_number ?? null) : null,
    notes: data.notes ?? null,
    status: "sent",
    total,
    order_type: orderType,
    customer_name: data.customer_name ?? null,
    customer_phone: data.customer_phone ?? null,
    delivery_address: data.delivery_address ?? null,
    paid_amount: 0,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (supabase as any)
    .from("orders")
    .insert(insertPayload)
    .select()
    .single();

  if (orderError) {
    console.error("createOrder: order insert failed", orderError);
    throw new Error(
      `Erreur lors de la création de la commande : ${orderError.message}`
    );
  }

  // Resolve course numbers for all products
  const productIds = data.items.map((item) => item.is_menu_header ? null : item.product_id);
  const courseMap = await resolveCourseNumbers(productIds, orderType);

  // Insert order items with course_number
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
    course_number: item.is_menu_header ? 0 : (courseMap.get(item.product_id) ?? 1),
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
      course_number: item.course_number ?? 1,
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

  // Recalculate total from all items (P0-5: exclude cancelled items)
  const { data: allItems, error: fetchError } = await supabase
    .from("order_items")
    .select("quantity, unit_price, status")
    .eq("order_id", orderId);

  if (fetchError) {
    throw new Error(
      `Erreur lors du recalcul du total : ${fetchError.message}`
    );
  }

  const newTotal = (allItems ?? [])
    .filter((item) => item.status !== "cancelled")
    .reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

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
    .select("id, product_id, course_number")
    .eq("order_id", orderId)
    .is("preparation_ticket_id", null);

  if (newItems && newItems.length > 0) {
    try {
      await addItemsToPreparationTickets(
        orderId,
        newItems.map((item) => ({
          order_item_id: item.id,
          product_id: item.product_id,
          course_number: item.course_number ?? 1,
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

// ---------------------------------------------------------------------------
// Cancellations
// ---------------------------------------------------------------------------

export async function cancelOrderItem(
  itemId: string,
  reason: string
): Promise<void> {
  const { userId, restaurantId, role } = await getUserContext();
  const supabase = await createClient();

  // P0-3: Only owner/admin/manager can cancel items
  if (!["owner", "admin", "manager"].includes(role)) {
    throw new Error("Seuls les responsables peuvent annuler un article.");
  }

  // Fetch item + verify restaurant ownership
  const { data: item, error: fetchErr } = await supabase
    .from("order_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (fetchErr || !item) {
    throw new Error("Article non trouvé.");
  }

  // P0-2: Guard against double cancellation
  if (item.status === "cancelled") {
    throw new Error("Cet article est déjà annulé.");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, restaurant_id, total")
    .eq("id", item.order_id)
    .single();

  if (!order || order.restaurant_id !== restaurantId) {
    throw new Error("Commande non trouvée.");
  }

  // Mark item as cancelled
  const { error: updateErr } = await supabase
    .from("order_items")
    .update({ status: "cancelled" })
    .eq("id", itemId);

  if (updateErr) {
    throw new Error(`Erreur annulation article : ${updateErr.message}`);
  }

  // Insert cancellation record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("order_cancellations").insert({
    order_id: item.order_id,
    order_item_id: itemId,
    restaurant_id: restaurantId,
    reason,
    cancelled_by: userId,
  });

  // Recalculate order total (excluding cancelled items)
  const { data: activeItems } = await supabase
    .from("order_items")
    .select("quantity, unit_price, status")
    .eq("order_id", item.order_id);

  const newTotal = (activeItems ?? [])
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  await supabase
    .from("orders")
    .update({ total: newTotal, updated_at: new Date().toISOString() })
    .eq("id", item.order_id);

  // Clean preparation ticket: remove from ticket if item was on one
  if (item.preparation_ticket_id) {
    // Check if there are remaining non-cancelled items on this ticket
    const { data: ticketItems } = await supabase
      .from("order_items")
      .select("id, status")
      .eq("preparation_ticket_id", item.preparation_ticket_id);

    const activeTicketItems = (ticketItems ?? []).filter(
      (ti) => ti.status !== "cancelled"
    );

    if (activeTicketItems.length === 0) {
      // All items cancelled — delete the ticket
      await supabase
        .from("preparation_tickets")
        .delete()
        .eq("id", item.preparation_ticket_id);
    }
  }
}

export async function cancelOrder(
  orderId: string,
  reason: string
): Promise<void> {
  const { userId, restaurantId, role } = await getUserContext();
  const supabase = await createClient();

  // Only owner/admin/manager can cancel entire orders
  if (!["owner", "admin", "manager"].includes(role)) {
    throw new Error("Seuls les responsables peuvent annuler une commande entière.");
  }

  // Verify order exists + belongs to restaurant
  const { data: order } = await supabase
    .from("orders")
    .select("id, restaurant_id")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!order) {
    throw new Error("Commande non trouvée.");
  }

  // Cancel all non-cancelled items
  const { data: items } = await supabase
    .from("order_items")
    .select("id, preparation_ticket_id")
    .eq("order_id", orderId)
    .neq("status", "cancelled");

  if (items && items.length > 0) {
    await supabase
      .from("order_items")
      .update({ status: "cancelled" })
      .eq("order_id", orderId)
      .neq("status", "cancelled");
  }

  // Insert cancellation record (order-level, no item_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("order_cancellations").insert({
    order_id: orderId,
    order_item_id: null,
    restaurant_id: restaurantId,
    reason,
    cancelled_by: userId,
  });

  // Cancel the order itself
  await supabase
    .from("orders")
    .update({
      status: "cancelled",
      total: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  // Delete all preparation tickets for this order
  const ticketIds = [
    ...new Set(
      (items ?? [])
        .map((i) => i.preparation_ticket_id)
        .filter((id): id is string => id !== null)
    ),
  ];
  if (ticketIds.length > 0) {
    await supabase
      .from("preparation_tickets")
      .delete()
      .in("id", ticketIds);
  }
}

export async function getCancellations(): Promise<OrderCancellation[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cancellations, error } = await (supabase as any)
    .from("order_cancellations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("cancelled_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Erreur chargement annulations : ${error.message}`);
  }

  if (!cancellations || cancellations.length === 0) return [];

  // Fetch related data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = cancellations as any[];
  const orderIds = [...new Set(rows.map((c: { order_id: string }) => c.order_id))];
  const itemIds = rows
    .map((c: { order_item_id: string | null }) => c.order_item_id)
    .filter((id: string | null): id is string => id !== null);
  const userIds = rows
    .map((c: { cancelled_by: string | null }) => c.cancelled_by)
    .filter((id: string | null): id is string => id !== null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ordersRes, itemsRes, profilesRes] = await Promise.all([
    (supabase as any)
      .from("orders")
      .select("id, table_number, order_type")
      .in("id", orderIds),
    itemIds.length > 0
      ? supabase.from("order_items").select("id, product_name").in("id", itemIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? supabase.from("profiles").select("id, first_name, last_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const orderMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((ordersRes.data ?? []) as any[]).map((o: any) => [o.id, o])
  );
  const itemMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((itemsRes.data ?? []) as any[]).map((i: any) => [i.id, i])
  );
  const profileMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((profilesRes.data ?? []) as any[]).map((p: any) => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(" ") || "Inconnu",
    ])
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((c: any) => {
    const order = orderMap.get(c.order_id);
    const item = c.order_item_id ? itemMap.get(c.order_item_id) : null;
    return {
      id: c.id,
      order_id: c.order_id,
      order_item_id: c.order_item_id,
      reason: c.reason,
      cancelled_by: c.cancelled_by,
      cancelled_at: c.cancelled_at,
      table_number: order?.table_number ?? null,
      product_name: item?.product_name ?? null,
      cancelled_by_name: c.cancelled_by ? profileMap.get(c.cancelled_by) ?? null : null,
      order_type: order?.order_type ?? "dine_in",
    };
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function createPayment(
  orderId: string,
  data: {
    amount: number;
    method: PaymentMethod;
    label?: string;
    itemIds?: string[];
  }
): Promise<void> {
  const { userId, restaurantId, role } = await getUserContext();
  const supabase = await createClient();

  // P0-4: Only owner/admin/manager/staff can process payments (not cook)
  if (!["owner", "admin", "manager", "staff"].includes(role)) {
    throw new Error("Vous n'avez pas les droits pour encaisser.");
  }

  // Verify order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("id, restaurant_id, total, paid_amount, status")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!order) {
    throw new Error("Commande non trouvée.");
  }

  if (data.amount <= 0) {
    throw new Error("Le montant doit être supérieur à 0.");
  }

  // P0-1: Guard against overpayment
  const currentPaid = order.paid_amount ?? 0;
  const remaining = (order.total ?? 0) - currentPaid;
  if (data.amount > remaining + 0.01) {
    throw new Error(
      `Montant trop élevé. Reste à payer : ${remaining.toFixed(2)} €.`
    );
  }

  // Insert payment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payment, error: payErr } = await (supabase as any)
    .from("order_payments")
    .insert({
      order_id: orderId,
      restaurant_id: restaurantId,
      amount: data.amount,
      method: data.method,
      label: data.label ?? null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (payErr) {
    throw new Error(`Erreur création paiement : ${payErr.message}`);
  }

  // Mark items as paid if itemIds provided
  if (data.itemIds && data.itemIds.length > 0 && payment) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("order_items")
      .update({ payment_id: payment.id })
      .in("id", data.itemIds)
      .eq("order_id", orderId);
  }

  // Update paid_amount on order
  const newPaidAmount = (order.paid_amount ?? 0) + data.amount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, unknown> = {
    paid_amount: newPaidAmount,
    updated_at: new Date().toISOString(),
  };

  // If fully paid, mark order as paid
  if (newPaidAmount >= (order.total ?? 0)) {
    updatePayload.status = "paid";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId);
}

export async function getOrderPayments(
  orderId: string
): Promise<OrderPayment[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Verify order belongs to restaurant
  const { data: order } = await supabase
    .from("orders")
    .select("id, restaurant_id")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!order) {
    throw new Error("Commande non trouvée.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("order_payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Erreur chargement paiements : ${error.message}`);
  }

  return (data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => ({
      id: p.id,
      order_id: p.order_id,
      amount: p.amount,
      method: p.method,
      label: p.label,
      created_by: p.created_by,
      created_at: p.created_at,
    })
  );
}

// ---------------------------------------------------------------------------
// Restaurant Tables (plan de salle dynamique)
// ---------------------------------------------------------------------------

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  name: string;
  zone: string;
  capacity: number;
  shape: "square" | "round" | "rectangle";
  width: number;
  height: number;
  pos_x: number;
  pos_y: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getRestaurantTables(): Promise<RestaurantTable[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createUntypedClient();

  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Erreur chargement tables restaurant: ${error.message}`);
  }

  return (data ?? []) as RestaurantTable[];
}

export async function upsertRestaurantTables(
  tables: Omit<RestaurantTable, "restaurant_id" | "created_at" | "updated_at" | "is_active">[]
): Promise<void> {
  // P1-6: Only owner/admin can modify floor plan
  const { restaurantId, role } = await getUserContext();
  if (!["owner", "admin"].includes(role)) {
    throw new Error("Seuls les administrateurs peuvent modifier le plan de salle.");
  }
  const supabase = await createUntypedClient();

  const now = new Date().toISOString();

  const rows = tables.map((t) => ({
    id: t.id,
    restaurant_id: restaurantId,
    name: t.name,
    zone: t.zone,
    capacity: t.capacity,
    shape: t.shape,
    width: t.width,
    height: t.height,
    pos_x: t.pos_x,
    pos_y: t.pos_y,
    is_active: true,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("restaurant_tables")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    throw new Error(`Erreur sauvegarde tables: ${error.message}`);
  }
}

export async function deleteRestaurantTable(tableId: string): Promise<void> {
  // P1-6: Only owner/admin can delete tables
  const { restaurantId, role } = await getUserContext();
  if (!["owner", "admin"].includes(role)) {
    throw new Error("Seuls les administrateurs peuvent supprimer des tables.");
  }
  const supabase = await createUntypedClient();

  const { error } = await supabase
    .from("restaurant_tables")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(`Erreur suppression table: ${error.message}`);
  }
}
