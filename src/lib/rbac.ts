import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppModule, PermissionAction } from "@/lib/rbac-constants";

interface UserContext {
  restaurantId: string;
  role: string;
}

/**
 * Get the current user's role and restaurant from profiles.
 */
async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.restaurant_id || !profile?.role) return null;

  return { restaurantId: profile.restaurant_id, role: profile.role };
}

/**
 * Check if the current user has a specific permission.
 */
export async function hasPermission(
  module: AppModule,
  action: PermissionAction
): Promise<boolean> {
  const ctx = await getUserContext();
  if (!ctx) return false;

  const supabase = await createClient();
  const column = `can_${action}` as const;

  const { data } = await supabase
    .from("role_permissions")
    .select(column)
    .eq("restaurant_id", ctx.restaurantId)
    .eq("role", ctx.role)
    .eq("module", module)
    .single();

  if (!data) return false;
  return (data as Record<string, boolean>)[column] === true;
}

/**
 * Guard: require a permission or redirect to dashboard.
 */
export async function requirePermission(
  module: AppModule,
  action: PermissionAction
): Promise<{ restaurantId: string; role: string }> {
  const ctx = await getUserContext();
  if (!ctx) redirect("/connexion");

  const supabase = await createClient();
  const column = `can_${action}` as const;

  const { data } = await supabase
    .from("role_permissions")
    .select(column)
    .eq("restaurant_id", ctx.restaurantId)
    .eq("role", ctx.role)
    .eq("module", module)
    .single();

  const allowed = data ? (data as Record<string, boolean>)[column] === true : false;

  if (!allowed) {
    redirect("/tableau-de-bord");
  }

  return ctx;
}

export interface ModulePermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

/**
 * Get all permissions for a role in a restaurant (for sidebar/admin UI).
 */
/**
 * Guard for Server Actions: require auth + permission, throw Error (not redirect).
 * Returns { restaurantId, role } on success.
 * Use this in every server action that mutates data.
 */
export async function requireActionPermission(
  module: AppModule,
  action: PermissionAction
): Promise<{ restaurantId: string; role: string }> {
  const ctx = await getUserContext();
  if (!ctx) throw new Error("Non authentifié");

  const supabase = await createClient();
  const column = `can_${action}` as const;

  const { data } = await supabase
    .from("role_permissions")
    .select(column)
    .eq("restaurant_id", ctx.restaurantId)
    .eq("role", ctx.role)
    .eq("module", module)
    .single();

  const allowed = data ? (data as Record<string, boolean>)[column] === true : false;

  if (!allowed) {
    throw new Error("Permission refusée");
  }

  return ctx;
}

export async function getPermissionsForRole(
  restaurantId: string,
  role: string
): Promise<Map<string, ModulePermissions>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("role_permissions")
    .select("module, can_read, can_write, can_delete")
    .eq("restaurant_id", restaurantId)
    .eq("role", role);

  const map = new Map<string, ModulePermissions>();
  for (const row of data ?? []) {
    map.set(row.module, {
      can_read: row.can_read,
      can_write: row.can_write,
      can_delete: row.can_delete,
    });
  }
  return map;
}
