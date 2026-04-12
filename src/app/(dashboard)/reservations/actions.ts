"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/rbac";
import type { Tables, Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const reservationSchema = z.object({
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().max(20).optional().nullable(),
  customer_email: z.string().email().optional().nullable().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  party_size: z.number().int().min(1).max(100),
  table_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(["pending", "confirmed", "seated", "completed", "cancelled", "no_show"]).optional(),
  type: z.enum(["restaurant", "salle", "seminaire"]).optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReservationRow = Tables<"reservations">;
type ReservationInsert = Database["public"]["Tables"]["reservations"]["Insert"];
type ReservationUpdate = Database["public"]["Tables"]["reservations"]["Update"];

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

export type ReservationType = "restaurant" | "salle" | "seminaire";

export interface ReservationFilters {
  status?: ReservationStatus[];
  type?: ReservationType[];
  dateFrom?: string; // ISO date string (YYYY-MM-DD)
  dateTo?: string;
  search?: string;
}

export interface ReservationStats {
  total: number;
  totalCovers: number;
  byStatus: Record<ReservationStatus, number>;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getReservations(
  filters: ReservationFilters = {}
): Promise<ReservationRow[]> {
  const { restaurantId } = await requireActionPermission("m02_reservations", "read");
  const supabase = await createClient();

  let query = supabase
    .from("reservations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (filters.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters.type && filters.type.length > 0) {
    query = query.in("type", filters.type);
  }

  if (filters.dateFrom) {
    query = query.gte("date", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("date", filters.dateTo);
  }

  if (filters.search) {
    // Search on customer name, phone or email
    query = query.or(
      `customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erreur lors du chargement des réservations : ${error.message}`);
  }

  return data ?? [];
}

export async function getReservation(
  id: string
): Promise<ReservationRow | null> {
  const { restaurantId } = await requireActionPermission("m02_reservations", "read");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Erreur lors du chargement de la réservation : ${error.message}`);
  }

  return data;
}

export async function getReservationStats(
  date: string
): Promise<ReservationStats> {
  const { restaurantId } = await requireActionPermission("m02_reservations", "read");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reservations")
    .select("status, party_size")
    .eq("restaurant_id", restaurantId)
    .eq("date", date);

  if (error) {
    throw new Error(`Erreur lors du chargement des statistiques : ${error.message}`);
  }

  const allStatuses: ReservationStatus[] = [
    "pending",
    "confirmed",
    "seated",
    "completed",
    "cancelled",
    "no_show",
  ];

  const byStatus = Object.fromEntries(
    allStatuses.map((s) => [s, 0])
  ) as Record<ReservationStatus, number>;

  let total = 0;
  let totalCovers = 0;

  for (const row of data ?? []) {
    const status = (row.status ?? "pending") as ReservationStatus;
    if (status in byStatus) {
      byStatus[status]++;
    }
    total++;
    totalCovers += row.party_size;
  }

  return { total, totalCovers, byStatus };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createReservation(
  data: Omit<ReservationInsert, "restaurant_id" | "id" | "created_at" | "updated_at">
): Promise<ReservationRow> {
  const { restaurantId } = await requireActionPermission("m02_reservations", "write");
  const supabase = await createClient();

  reservationSchema.parse(data);

  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({ ...data, restaurant_id: restaurantId })
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur lors de la création de la réservation : ${error.message}`);
  }

  return reservation;
}

export async function updateReservation(
  id: string,
  data: Omit<ReservationUpdate, "id" | "restaurant_id" | "created_at">
): Promise<ReservationRow> {
  const { restaurantId } = await requireActionPermission("m02_reservations", "write");
  const supabase = await createClient();

  reservationSchema.partial().parse(data);

  const { data: reservation, error } = await supabase
    .from("reservations")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur lors de la mise à jour de la réservation : ${error.message}`);
  }

  return reservation;
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus
): Promise<ReservationRow> {
  return updateReservation(id, { status });
}

export async function deleteReservation(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m02_reservations", "delete");
  const supabase = await createClient();

  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(`Erreur lors de la suppression de la réservation : ${error.message}`);
  }
}
