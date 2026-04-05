"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Tables, Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductRow = Tables<"products">;
type MenuCategoryRow = Tables<"menu_categories">;
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

export interface CarteStats {
  totalProducts: number;
  availableProducts: number;
  totalRecipes: number;
  avgFoodCostRatio: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return supabase;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<MenuCategoryRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  name: string,
  sortOrder: number
): Promise<MenuCategoryRow> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user!.id)
    .single();

  const { data, error } = await supabase
    .from("menu_categories")
    .insert({
      restaurant_id: profile!.restaurant_id!,
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
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("menu_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProducts(): Promise<ProductRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function createProduct(
  product: Omit<ProductInsert, "restaurant_id">
): Promise<ProductRow> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user!.id)
    .single();

  const { data, error } = await supabase
    .from("products")
    .insert({ ...product, restaurant_id: profile!.restaurant_id! })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(
  id: string,
  updates: ProductUpdate
): Promise<ProductRow> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleProductAvailability(
  id: string,
  isAvailable: boolean
): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("products")
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export async function getRecipes(): Promise<RecipeWithIngredients[]> {
  const supabase = await getSupabase();

  const { data: recipes, error: recipesError } = await supabase
    .from("recipes")
    .select("*")
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
  const supabase = await getSupabase();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
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
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user!.id)
    .single();

  const { data: newRecipe, error } = await supabase
    .from("recipes")
    .insert({ ...recipe, restaurant_id: profile!.restaurant_id! })
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
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("recipes")
    .update({ ...recipe, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  if (ingredients !== undefined) {
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
    if (ingredients.length > 0) {
      const { error: ingError } = await supabase
        .from("recipe_ingredients")
        .insert(
          ingredients.map((ing, i) => ({
            ...ing,
            recipe_id: id,
            sort_order: i,
          }))
        );
      if (ingError) throw ingError;
    }
  }
}

export async function deleteRecipe(id: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getCarteStats(): Promise<CarteStats> {
  const supabase = await getSupabase();

  const { data: products } = await supabase.from("products").select("*");
  const { count: recipeCount } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true });

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
  };
}
