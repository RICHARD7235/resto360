"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserRestaurantId } from "@/lib/qhs/auth";
import { revalidatePath } from "next/cache";
import type { AppRole, AppModule } from "@/lib/rbac-constants";

export async function getAllPermissions() {
  const supabase = await createClient();
  const restaurantId = await getUserRestaurantId();

  const { data } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("role")
    .order("module");

  return data ?? [];
}

export async function updatePermission(
  role: AppRole,
  module: AppModule,
  field: "can_read" | "can_write" | "can_delete",
  value: boolean
) {
  if (role === "owner") return { error: "Les permissions owner ne sont pas modifiables" };

  const supabase = await createClient();
  const restaurantId = await getUserRestaurantId();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifie" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role || !["owner", "admin"].includes(profile.role)) {
    return { error: "Acces refuse" };
  }

  if (role === "admin" && profile.role === "admin") {
    return { error: "Un admin ne peut pas modifier ses propres permissions" };
  }

  const updateData: { can_read?: boolean; can_write?: boolean; can_delete?: boolean } = {};
  updateData[field] = value;

  const { error } = await supabase
    .from("role_permissions")
    .update(updateData)
    .eq("restaurant_id", restaurantId)
    .eq("role", role)
    .eq("module", module);

  if (error) return { error: error.message };

  revalidatePath("/admin-operationnelle/roles");
  return { success: true };
}

export async function resetPermissions() {
  const supabase = await createClient();
  const restaurantId = await getUserRestaurantId();

  await supabase
    .from("role_permissions")
    .delete()
    .eq("restaurant_id", restaurantId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)("seed_default_permissions", {
    p_restaurant_id: restaurantId,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin-operationnelle/roles");
  return { success: true };
}
