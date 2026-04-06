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
