"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Tables, Database } from "@/types/database.types";
import { requireActionPermission } from "@/lib/rbac";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  sort_order: z.number().int().min(0),
  station: z.string().optional(),
});

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().min(0),
  cost_price: z.number().min(0).optional().nullable(),
  category_id: z.string().uuid(),
  allergens: z.array(z.string()).optional().nullable(),
  is_available: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
});

const recipeIngredientSchema = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.number().min(0),
  unit: z.string().min(1),
});

const recipeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  portions: z.number().int().min(1).optional().nullable(),
  preparation_time: z.number().int().min(0).optional().nullable(),
  instructions: z.string().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductRow = Tables<"products">;
type MenuCategoryRow = Tables<"menu_categories">;
type MenuRow = Tables<"menus">;
type MenuItemRow = Tables<"menu_items">;
type RecipeRow = Tables<"recipes">;
type RecipeIngredientRow = Tables<"recipe_ingredients">;

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
type RecipeInsert = Database["public"]["Tables"]["recipes"]["Insert"];
type RecipeIngredientInsert =
  Database["public"]["Tables"]["recipe_ingredients"]["Insert"];

export interface RecipeWithIngredients extends RecipeRow {
  ingredients: RecipeIngredientRow[];
  product?: ProductRow | null;
}

export interface CategoryWithProducts extends MenuCategoryRow {
  products: ProductRow[];
}

export interface MenuItemWithProduct extends MenuItemRow {
  product?: ProductRow | null;
}

export interface MenuWithItems extends MenuRow {
  items: MenuItemWithProduct[];
}

export interface CarteStats {
  totalProducts: number;
  availableProducts: number;
  totalRecipes: number;
  avgFoodCostRatio: number;
  totalMenus: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// getSupabase() removed — use requireActionPermission() + createClient() instead

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<MenuCategoryRow[]> {
  const { restaurantId } = await requireActionPermission("m04_carte", "read");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  name: string,
  sortOrder: number
): Promise<MenuCategoryRow> {
  const { restaurantId } = await requireActionPermission("m04_carte", "write");
  const supabase = await createClient();

  categorySchema.parse({ name, sort_order: sortOrder });

  const { data, error } = await supabase
    .from("menu_categories")
    .insert({
      restaurant_id: restaurantId,
      name,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: string,
  updates: { name?: string; sort_order?: number }
): Promise<MenuCategoryRow> {
  const { restaurantId } = await requireActionPermission("m04_carte", "write");
  const supabase = await createClient();

  categorySchema.partial().parse(updates);

  const { data, error } = await supabase
    .from("menu_categories")
    .update(updates)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoryStation(
  id: string,
  stationId: string | null
): Promise<void> {
  const { restaurantId } = await requireActionPermission("m04_carte", "write");
  const supabase = await createClient();

  const { error } = await supabase
    .from("menu_categories")
    .update({ default_station_id: stationId })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(`Erreur mise a jour du poste categorie : ${error.message}`);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m04_carte", "delete");
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProducts(): Promise<ProductRow[]> {
  const { restaurantId } = await requireActionPermission("m04_carte", "read");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const { restaurantId } = await requireActionPermission("m04_carte", "read");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();
  if (error) return null;
  return data;
}

export async function createProduct(
  product: Omit<ProductInsert, "restaurant_id">
): Promise<ProductRow> {
  const { restaurantId } = await requireActionPermission("m04_carte", "write");
  const supabase = await createClient();

  productSchema.parse(product);

  const { data, error } = await supabase
    .from("products")
    .insert({ ...product, restaurant_id: restaurantId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(
  id: string,
  updates: ProductUpdate
): Promise<ProductRow> {
  const { restaurantId } = await requireActionPermission("m04_carte", "write");
  const supabase = await createClient();

  productSchema.partial().parse(updates);

  const { data, error } = await supabase
    .from("products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleProductAvailability(
  id: string,
  isAvailable: boolean
): Promise<void> {
  const { restaurantId } = await requireActionPermission("m04_carte", "write");
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m04_carte", "delete");
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export async function getRecipes(): Promise<RecipeWithIngredients[]> {
  const { restaurantId } = await requireActionPermission("m04_carte", "read");
  const supabase = await createClient();

  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });
  if (recipesError) throw recipesError;
  if (!recipes || recipes.length === 0) return [];

  const recipeIds = recipes.map((r) => r.id);
  const { data: ingredients, error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .in("recipe_id", recipeIds)
    .order("sort_order", { ascending: true });
  if (ingredientsError) throw ingredientsError;

  const productIds = recipes
    .map((r) => r.product_id)
    .filter((id): id is string => id !== null);
  let products: ProductRow[] = [];
  if (productIds.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);
    if (!error && data) products = data;
  }

  return recipes.map((recipe) => ({
    ...recipe,
    ingredients: (ingredients ?? []).filter((i) => i.recipe_id === recipe.id),
    product: products.find((p) => p.id === recipe.product_id) ?? null,
  }));
}

export async function getRecipe(
  id: string
): Promise<RecipeWithIngredients | null> {
  const { restaurantId } = await requireActionPermission("m04_carte", "read");
  const supabase = await createClient();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();
  if (error) return null;

  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .eq("recipe_id", id)
    .order("sort_order", { ascending: true });

  let product: ProductRow | null = null;
  if (recipe.product_id) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", recipe.product_id)
      .single();
    product = data;
  }

  return { ...recipe, ingredients: ingredients ?? [], product };
}

export async function createRecipe(
  recipe: Omit<RecipeInsert, "restaurant_id">,
  ingredients: Omit<RecipeIngredientInsert, "recipe_id">[]
): Promise<RecipeWithIngredients> {
  const { restaurantId } = await requireActionPermission("m04_carte", "write");
  const supabase = await createClient();

  recipeSchema.parse(recipe);
  z.array(recipeIngredientSchema).parse(ingredients);

  const { data: newRecipe, error } = await supabase
    .from("recipes")
    .insert({ ...recipe, restaurant_id: restaurantId })
    .select()
    .single();
  if (error) throw error;

  let newIngredients: RecipeIngredientRow[] = [];
  if (ingredients.length > 0) {
    const { data, error: ingError } = await supabase
      .from("recipe_ingredients")
      .insert(
        ingredients.map((ing, i) => ({
          ...ing,
          recipe_id: newRecipe.id,
          sort_order: i,
        }))
      )
      .select();
    if (ingError) throw ingError;
    newIngredients = data ?? [];
  }

  return { ...newRecipe, ingredients: newIngredients, product: null };
}

export async function updateRecipe(
  id: string,
  recipe: Database["public"]["Tables"]["recipes"]["Update"],
  ingredients?: Omit<RecipeIngredientInsert, "recipe_id">[]
): Promise<void> {
  const { restaurantId } = await requireActionPermission("m04_carte", "write");
  const supabase = await createClient();

  recipeSchema.partial().parse(recipe);
  if (ingredients !== undefined) {
    z.array(recipeIngredientSchema).parse(ingredients);
  }

  // Verify ownership before any mutation
  const { data: existing, error: fetchError } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();
  if (fetchError || !existing) throw new Error("Recette introuvable");

  const { error } = await supabase
    .from("recipes")
    .update({ ...recipe, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;

  if (ingredients !== undefined) {
    // Atomic replace via RPC — prevents orphaned recipes if INSERT fails after DELETE
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase.rpc as any)(
      "replace_recipe_ingredients",
      {
        p_recipe_id: id,
        p_restaurant_id: restaurantId,
        p_ingredients: JSON.stringify(
          ingredients.map((ing, i) => ({
            ...ing,
            sort_order: i,
          }))
        ),
      }
    );

    if (rpcError) {
      throw new Error(
        rpcError.message?.includes("not found")
          ? "Recette introuvable"
          : `Erreur mise à jour des ingrédients : ${rpcError.message}`
      );
    }
  }

  /* --- FALLBACK: ancien code non atomique (si la migration n'est pas encore appliquée) ---
  if (ingredients !== undefined) {
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
    if (ingredients.length > 0) {
      const { error: ingError } = await supabase
        .from("recipe_ingredients")
        .insert(ingredients.map((ing, i) => ({ ...ing, recipe_id: id, sort_order: i })));
      if (ingError) throw ingError;
    }
  }
  --- FIN FALLBACK --- */
}

export async function deleteRecipe(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m04_carte", "delete");
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Menus & Formules
// ---------------------------------------------------------------------------

export async function getMenus(): Promise<MenuWithItems[]> {
  const { restaurantId } = await requireActionPermission("m04_carte", "read");
  const supabase = await createClient();

  const { data: menus, error: menusError } = await supabase
    .from("menus")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });
  if (menusError) throw menusError;
  if (!menus || menus.length === 0) return [];

  // Fetch all menu_items for these menus
  const menuIds = menus.map((m) => m.id);
  const { data: menuItems, error: itemsError } = await supabase
    .from("menu_items")
    .select("*")
    .in("menu_id", menuIds)
    .order("sort_order", { ascending: true });
  if (itemsError) throw itemsError;

  // Fetch products referenced by menu_items
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

export async function getMenu(id: string): Promise<MenuWithItems | null> {
  const { restaurantId } = await requireActionPermission("m04_carte", "read");
  const supabase = await createClient();

  const { data: menu, error } = await supabase
    .from("menus")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();
  if (error) return null;

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .eq("menu_id", id)
    .order("sort_order", { ascending: true });

  const productIds = (menuItems ?? [])
    .map((mi) => mi.product_id)
    .filter((pid): pid is string => pid !== null);
  let products: ProductRow[] = [];
  if (productIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);
    products = data ?? [];
  }

  return {
    ...menu,
    items: (menuItems ?? []).map((mi) => ({
      ...mi,
      product: products.find((p) => p.id === mi.product_id) ?? null,
    })),
  };
}

export async function toggleMenuAvailability(
  id: string,
  isAvailable: boolean
): Promise<void> {
  const { restaurantId } = await requireActionPermission("m04_carte", "write");
  const supabase = await createClient();
  const { error } = await supabase
    .from("menus")
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
}

export async function deleteMenu(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m04_carte", "delete");
  const supabase = await createClient();
  const { error } = await supabase
    .from("menus")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getCarteStats(): Promise<CarteStats> {
  const { restaurantId } = await requireActionPermission("m04_carte", "read");
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId);
  const { count: recipeCount } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  const { count: menuCount } = await supabase
    .from("menus")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  const allProducts = products ?? [];
  const withCost = allProducts.filter(
    (p) => p.cost_price !== null && p.cost_price > 0 && p.price > 0
  );
  const avgRatio =
    withCost.length > 0
      ? withCost.reduce((sum, p) => sum + p.cost_price! / p.price, 0) /
        withCost.length
      : 0;

  return {
    totalProducts: allProducts.length,
    availableProducts: allProducts.filter((p) => p.is_available).length,
    totalRecipes: recipeCount ?? 0,
    avgFoodCostRatio: Math.round(avgRatio * 100),
    totalMenus: menuCount ?? 0,
  };
}
