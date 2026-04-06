"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  ChefHat,
  ClipboardList,
  Percent,
  Plus,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCarteStore } from "@/stores/carte.store";
import { MenuEditor } from "@/components/modules/carte/menu-editor";
import { ProductForm } from "@/components/modules/carte/product-form";
import type { ProductFormData } from "@/components/modules/carte/product-form";
import { RecipeList } from "@/components/modules/carte/recipe-list";
import { RecipeDetail } from "@/components/modules/carte/recipe-detail";
import { RecipeForm } from "@/components/modules/carte/recipe-form";
import type { RecipeFormData } from "@/components/modules/carte/recipe-form";
import { MenuFormulasList } from "@/components/modules/carte/menu-formulas-list";
import {
  getCategories,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  toggleProductAvailability,
  deleteProduct,
  getRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getCarteStats,
  getMenus,
  toggleMenuAvailability,
  deleteMenu,
  updateCategoryStation,
} from "./actions";
import type {
  CarteStats,
  RecipeWithIngredients,
  MenuWithItems,
} from "./actions";
import { getActiveStations } from "@/app/(dashboard)/admin-operationnelle/actions";
import type { Tables } from "@/types/database.types";

type Product = Tables<"products">;
type MenuCategory = Tables<"menu_categories">;
type Station = Tables<"preparation_stations">;

export default function CartePage() {
  const {
    activeTab,
    searchQuery,
    selectedProductId,
    selectedRecipeId,
    productFormOpen,
    recipeFormOpen,
    setActiveTab,
    setSearchQuery,
    setSelectedProductId,
    setSelectedRecipeId,
    setProductFormOpen,
    setRecipeFormOpen,
  } = useCarteStore();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [menus, setMenus] = useState<MenuWithItems[]>([]);
  const [stats, setStats] = useState<CarteStats>({
    totalProducts: 0,
    availableProducts: 0,
    totalRecipes: 0,
    avgFoodCostRatio: 0,
    totalMenus: 0,
  });
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Product being edited
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>();

  // Recipe detail/edit
  const [selectedRecipe, setSelectedRecipe] =
    useState<RecipeWithIngredients | null>(null);
  const [editingRecipe, setEditingRecipe] =
    useState<RecipeWithIngredients | null>(null);
  const [recipeDetailOpen, setRecipeDetailOpen] = useState(false);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      const [cats, stns, prods, recs, mns, st] = await Promise.all([
        getCategories(),
        getActiveStations(),
        getProducts(),
        getRecipes(),
        getMenus(),
        getCarteStats(),
      ]);
      setCategories(cats);
      setStations(stns);
      setProducts(prods);
      setRecipes(recs);
      setMenus(mns);
      setStats(st);
    } catch (err) {
      console.error("Erreur chargement carte:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Product handlers
  // -----------------------------------------------------------------------

  async function handleToggleAvailability(id: string, available: boolean) {
    await toggleProductAvailability(id, available);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_available: available } : p))
    );
    setStats((prev) => ({
      ...prev,
      availableProducts: prev.availableProducts + (available ? 1 : -1),
    }));
  }

  async function handleEditProduct(id: string) {
    const product = await getProduct(id);
    if (product) {
      setEditingProduct(product);
      setDefaultCategoryId(undefined);
      setProductFormOpen(true);
    }
  }

  function handleNewProduct(categoryId: string) {
    setEditingProduct(null);
    setDefaultCategoryId(categoryId);
    setProductFormOpen(true);
  }

  async function handleDeleteProduct(id: string) {
    await deleteProduct(id);
    loadData();
  }

  async function handleProductSubmit(data: ProductFormData) {
    setFormLoading(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
      } else {
        await createProduct(data);
      }
      setProductFormOpen(false);
      setEditingProduct(null);
      loadData();
    } finally {
      setFormLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Recipe handlers
  // -----------------------------------------------------------------------

  async function handleSelectRecipe(id: string) {
    const recipe = await getRecipe(id);
    if (recipe) {
      setSelectedRecipe(recipe);
      setRecipeDetailOpen(true);
    }
  }

  async function handleEditRecipe(id: string) {
    const recipe = await getRecipe(id);
    if (recipe) {
      setEditingRecipe(recipe);
      setRecipeDetailOpen(false);
      setRecipeFormOpen(true);
    }
  }

  function handleNewRecipe() {
    setEditingRecipe(null);
    setRecipeFormOpen(true);
  }

  async function handleDeleteRecipe(id: string) {
    await deleteRecipe(id);
    setRecipeDetailOpen(false);
    loadData();
  }

  async function handleRecipeSubmit(data: RecipeFormData) {
    setFormLoading(true);
    try {
      if (editingRecipe) {
        const { ingredients, ...recipeData } = data;
        await updateRecipe(editingRecipe.id, recipeData, ingredients);
      } else {
        const { ingredients, ...recipeData } = data;
        await createRecipe(recipeData, ingredients);
      }
      setRecipeFormOpen(false);
      setEditingRecipe(null);
      loadData();
    } finally {
      setFormLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Category station handler
  // -----------------------------------------------------------------------

  async function handleUpdateCategoryStation(
    categoryId: string,
    stationId: string | null
  ) {
    await updateCategoryStation(categoryId, stationId);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, default_station_id: stationId } : c
      )
    );
  }

  // -----------------------------------------------------------------------
  // Menu handlers
  // -----------------------------------------------------------------------

  async function handleToggleMenuAvailability(id: string, available: boolean) {
    await toggleMenuAvailability(id, available);
    setMenus((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_available: available } : m))
    );
  }

  async function handleDeleteMenu(id: string) {
    await deleteMenu(id);
    loadData();
  }

  // -----------------------------------------------------------------------
  // Filtered data
  // -----------------------------------------------------------------------

  const filteredProducts = searchQuery
    ? products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const filteredRecipes = searchQuery
    ? recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.description ?? "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : recipes;

  const filteredMenus = searchQuery
    ? menus.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.description ?? "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : menus;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement de la carte...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Carte & Recettes
          </h1>
          <p className="text-muted-foreground">
            Gérez votre carte et vos fiches techniques
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <div className="text-xs text-muted-foreground">
                Produits sur la carte
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <ChefHat className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {stats.availableProducts}
              </div>
              <div className="text-xs text-muted-foreground">Disponibles</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalRecipes}</div>
              <div className="text-xs text-muted-foreground">
                Fiches techniques
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Percent className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {stats.avgFoodCostRatio}%
              </div>
              <div className="text-xs text-muted-foreground">
                Coût matière moyen
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Carte / Fiches techniques */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "carte" | "menus" | "recettes")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="carte" className="gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Carte ({stats.totalProducts})
            </TabsTrigger>
            <TabsTrigger value="menus" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Menus ({stats.totalMenus})
            </TabsTrigger>
            <TabsTrigger value="recettes" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Fiches techniques ({stats.totalRecipes})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9"
              />
            </div>
            {activeTab === "recettes" && (
              <Button onClick={handleNewRecipe} className="gap-1 shrink-0">
                <Plus className="h-4 w-4" />
                Nouvelle fiche
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="carte" className="mt-4">
          <MenuEditor
            categories={categories}
            products={filteredProducts}
            stations={stations}
            onToggleAvailability={handleToggleAvailability}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onNewProduct={handleNewProduct}
            onUpdateCategoryStation={handleUpdateCategoryStation}
          />
        </TabsContent>

        <TabsContent value="menus" className="mt-4">
          <MenuFormulasList
            menus={filteredMenus}
            onToggleAvailability={handleToggleMenuAvailability}
            onDelete={handleDeleteMenu}
          />
        </TabsContent>

        <TabsContent value="recettes" className="mt-4">
          <RecipeList
            recipes={filteredRecipes}
            onSelect={handleSelectRecipe}
            onEdit={handleEditRecipe}
            onDelete={handleDeleteRecipe}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs / Sheets */}
      <ProductForm
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        product={editingProduct}
        categories={categories}
        defaultCategoryId={defaultCategoryId}
        stations={stations}
        onSubmit={handleProductSubmit}
        loading={formLoading}
      />

      <RecipeDetail
        recipe={selectedRecipe}
        open={recipeDetailOpen}
        onOpenChange={setRecipeDetailOpen}
        onEdit={() => {
          if (selectedRecipe) handleEditRecipe(selectedRecipe.id);
        }}
      />

      <RecipeForm
        open={recipeFormOpen}
        onOpenChange={setRecipeFormOpen}
        recipe={editingRecipe}
        products={products}
        onSubmit={handleRecipeSubmit}
        loading={formLoading}
      />
    </div>
  );
}
