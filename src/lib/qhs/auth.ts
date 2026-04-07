// src/lib/qhs/auth.ts
// Helper serveur : récupère le restaurantId de l'utilisateur connecté.
// Utilisable depuis les Server Components ET les Server Actions.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getUserRestaurantId(): Promise<string> {
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
