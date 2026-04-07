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

// Whitelist rôles autorisés à accéder aux pages admin QHS.
// ATTENTION : deux taxonomies coexistent.
//  - profiles.role (Supabase auth users) : "owner", "manager", "admin"...
//  - staff_members.role (PIN clôture NC) : "Gérant", "Adjointe de direction"...
// Cette liste vise profiles.role (auth web). Pour la clôture NC voir
// ADMIN_ROLES dans src/lib/supabase/qhs/mutations.ts.
// TODO post-démo : remplacer par RBAC propre (table roles + permissions).
export const QHS_ADMIN_ROLES = ["owner", "manager", "admin"];

export async function requireQhsAdmin(): Promise<{
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

  if (!profile.role || !QHS_ADMIN_ROLES.includes(profile.role)) {
    redirect("/qualite/nettoyage");
  }

  return { restaurantId: profile.restaurant_id, role: profile.role };
}
