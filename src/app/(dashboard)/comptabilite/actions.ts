"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingSnapshot } from "@/types/comptabilite";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function createUntypedClient(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

// ---------------------------------------------------------------------------
// Helpers – multi-tenant
// ---------------------------------------------------------------------------

async function getUserRestaurantId(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profile } = await (supabase as unknown as UntypedClient)
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.restaurant_id) {
    throw new Error("Aucun restaurant associé à votre compte.");
  }

  return profile.restaurant_id as string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getAllSnapshots(): Promise<AccountingSnapshot[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createUntypedClient();
  const { data, error } = await supabase
    .from("accounting_snapshots")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("period", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AccountingSnapshot[];
}
