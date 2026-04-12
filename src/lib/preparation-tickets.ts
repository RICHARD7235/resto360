import { createClient } from "@/lib/supabase/server";

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

/**
 * Resolves stations for multiple products in batch (fewer queries).
 * Priority: product.station_id > category.default_station_id > null
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
  const categoryStations = new Map<string, string | null>();
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
 * Creates preparation tickets for an order by splitting items by station AND course.
 * Tickets for course 0 and the lowest non-zero course are FIRED immediately.
 * Higher courses are HOLD (fired_at = null).
 */
export async function createPreparationTickets(
  orderId: string,
  items: { order_item_id: string; product_id: string | null; course_number: number }[],
  restaurantId: string
): Promise<void> {
  const supabase = await createClient();

  // Resolve stations
  const productIds = items.map((i) => i.product_id);
  const stationMap = await resolveStationsForProducts(productIds);

  // Group items by (station, course)
  const groups = new Map<string, { orderItemIds: string[]; course: number; stationId: string }>();
  const unassigned: { order_item_id: string; course_number: number }[] = [];

  for (const item of items) {
    const stationId = item.product_id ? stationMap.get(item.product_id) ?? null : null;
    if (stationId) {
      const key = `${stationId}::${item.course_number}`;
      const group = groups.get(key) ?? { orderItemIds: [], course: item.course_number, stationId };
      group.orderItemIds.push(item.order_item_id);
      groups.set(key, group);
    } else {
      unassigned.push(item);
    }
  }

  // Assign unassigned items to default station
  if (unassigned.length > 0) {
    const defaultStationId = await getDefaultStation(supabase, restaurantId);
    if (defaultStationId) {
      for (const item of unassigned) {
        const key = `${defaultStationId}::${item.course_number}`;
        const group = groups.get(key) ?? { orderItemIds: [], course: item.course_number, stationId: defaultStationId };
        group.orderItemIds.push(item.order_item_id);
        groups.set(key, group);
      }
    } else {
      console.warn(`[KDS] No default station for restaurant ${restaurantId}. ${unassigned.length} items unrouted.`);
    }
  }

  // Determine which courses to fire immediately
  const allCourses = [...new Set([...groups.values()].map((g) => g.course))];
  const nonZeroCourses = allCourses.filter((c) => c > 0);
  const minNonZero = nonZeroCourses.length > 0 ? Math.min(...nonZeroCourses) : null;

  const now = new Date().toISOString();

  // Create tickets and link items
  for (const group of groups.values()) {
    const shouldFire = group.course === 0 || group.course === minNonZero;

    const { data: ticket, error: ticketError } = await supabase
      .from("preparation_tickets")
      .insert({
        order_id: orderId,
        station_id: group.stationId,
        status: "pending",
        course_number: group.course,
        fired_at: shouldFire ? now : null,
      })
      .select()
      .single();

    if (ticketError) {
      throw new Error(`Erreur creation ticket: ${ticketError.message}`);
    }

    const { error: linkError } = await supabase
      .from("order_items")
      .update({ preparation_ticket_id: ticket.id })
      .in("id", group.orderItemIds);

    if (linkError) {
      throw new Error(`Erreur liaison items au ticket: ${linkError.message}`);
    }
  }
}

/**
 * Adds items to existing preparation tickets or creates new ones.
 * Respects course grouping — items join tickets matching (station, course).
 */
export async function addItemsToPreparationTickets(
  orderId: string,
  items: { order_item_id: string; product_id: string | null; course_number: number }[],
  restaurantId: string
): Promise<void> {
  const supabase = await createClient();

  // Resolve stations
  const productIds = items.map((i) => i.product_id);
  const stationMap = await resolveStationsForProducts(productIds);

  // Get existing tickets for this order
  const { data: existingTickets } = await supabase
    .from("preparation_tickets")
    .select("id, station_id, status, course_number")
    .eq("order_id", orderId);

  const ticketByKey = new Map<string, { id: string; status: string }>();
  for (const t of existingTickets ?? []) {
    const key = `${t.station_id}::${t.course_number ?? 1}`;
    ticketByKey.set(key, { id: t.id, status: t.status ?? "pending" });
  }

  // Group items by (station, course)
  const groups = new Map<string, { orderItemIds: string[]; course: number; stationId: string }>();
  const unassigned: { order_item_id: string; course_number: number }[] = [];

  for (const item of items) {
    const stationId = item.product_id ? stationMap.get(item.product_id) ?? null : null;
    if (stationId) {
      const key = `${stationId}::${item.course_number}`;
      const group = groups.get(key) ?? { orderItemIds: [], course: item.course_number, stationId };
      group.orderItemIds.push(item.order_item_id);
      groups.set(key, group);
    } else {
      unassigned.push(item);
    }
  }

  if (unassigned.length > 0) {
    const defaultStationId = await getDefaultStation(supabase, restaurantId);
    if (defaultStationId) {
      for (const item of unassigned) {
        const key = `${defaultStationId}::${item.course_number}`;
        const group = groups.get(key) ?? { orderItemIds: [], course: item.course_number, stationId: defaultStationId };
        group.orderItemIds.push(item.order_item_id);
        groups.set(key, group);
      }
    } else {
      console.warn(`[KDS] No default station for restaurant ${restaurantId}. ${unassigned.length} items unrouted.`);
    }
  }

  // For each group, use existing ticket or create new
  for (const group of groups.values()) {
    const key = `${group.stationId}::${group.course}`;
    const existing = ticketByKey.get(key);

    let ticketId: string;

    if (existing && existing.status !== "served") {
      ticketId = existing.id;
      if (existing.status === "ready") {
        await supabase
          .from("preparation_tickets")
          .update({ status: "in_progress", ready_at: null })
          .eq("id", ticketId);
      }
    } else {
      // Determine if this new ticket should be fired
      // Check if any existing ticket for this order has this course fired
      const firedForCourse = (existingTickets ?? []).some(
        (t) => (t.course_number ?? 1) === group.course && t.status !== "served"
      );
      const shouldFire = group.course === 0 || firedForCourse;

      const { data: ticket, error } = await supabase
        .from("preparation_tickets")
        .insert({
          order_id: orderId,
          station_id: group.stationId,
          status: "pending",
          course_number: group.course,
          fired_at: shouldFire ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erreur creation ticket: ${error.message}`);
      }
      ticketId = ticket.id;
    }

    const { error: linkError } = await supabase
      .from("order_items")
      .update({ preparation_ticket_id: ticketId })
      .in("id", group.orderItemIds);

    if (linkError) {
      throw new Error(`Erreur liaison items: ${linkError.message}`);
    }
  }
}
