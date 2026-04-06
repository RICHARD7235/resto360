import { createClient } from "@/lib/supabase/server";

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
 * Creates preparation tickets for an order by splitting items by station.
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

    const { error: linkError } = await supabase
      .from("order_items")
      .update({ preparation_ticket_id: ticketId })
      .in("id", orderItemIds);

    if (linkError) {
      throw new Error(`Erreur liaison items: ${linkError.message}`);
    }
  }
}
