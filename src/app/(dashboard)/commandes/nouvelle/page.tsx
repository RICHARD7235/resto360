"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCommandesStore } from "@/stores/commandes.store";
import { CategoryTabs } from "@/components/modules/commandes/category-tabs";
import { ProductGrid } from "@/components/modules/commandes/product-grid";
import { OrderPanel } from "@/components/modules/commandes/order-panel";
import {
  MenuSelectionDialog,
  type MenuSelection,
} from "@/components/modules/commandes/menu-selection-dialog";
import { getMenuCategories, getProducts, createOrder, getMenusForOrder } from "../actions";
import type { MenuWithItems } from "../actions";
import type { Tables } from "@/types/database.types";

type Category = Tables<"menu_categories">;
type Product = Tables<"products">;

export default function NouvelleCommandePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <NouvelleCommandeContent />
    </Suspense>
  );
}

function NouvelleCommandeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table") ?? "T1";

  const {
    cart,
    activeCategory,
    setActiveCategory,
    addToCart,
    addMenuToCart,
    removeFromCart,
    removeMenuFromCart,
    updateCartQuantity,
    clearCart,
  } = useCommandesStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [menus, setMenus] = useState<MenuWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Menu selection dialog state
  const [selectedMenu, setSelectedMenu] = useState<MenuWithItems | null>(null);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);

  // Charger les catégories et menus au montage
  useEffect(() => {
    Promise.all([getMenuCategories(), getMenusForOrder()]).then(
      ([cats, mns]) => {
        setCategories(cats);
        setMenus(mns);
        if (cats.length > 0 && !activeCategory) {
          setActiveCategory(cats[0].id);
        }
        setLoading(false);
      }
    );
  }, [activeCategory, setActiveCategory]);

  // Charger les produits quand la catégorie change
  useEffect(() => {
    if (activeCategory) {
      getProducts(activeCategory).then(setProducts);
    }
  }, [activeCategory]);

  // Vider le panier au montage si on arrive d'une autre page
  useEffect(() => {
    clearCart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAddProduct(product: Product) {
    addToCart({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity: 1,
      notes: "",
    });
  }

  function handleOpenMenuSelection(menu: MenuWithItems) {
    // If menu has no items defined, add it directly as a single line
    if (menu.items.length === 0) {
      addMenuToCart(
        {
          product_id: `menu-header-${menu.id}-${Date.now()}`,
          product_name: menu.name,
          unit_price: menu.price,
          quantity: 1,
          notes: "",
          menu_id: menu.id,
          menu_name: menu.name,
          is_menu_header: true,
        },
        []
      );
      return;
    }

    setSelectedMenu(menu);
    setMenuDialogOpen(true);
  }

  function handleMenuConfirm(selection: MenuSelection) {
    const uniqueId = `${selection.menu_id}-${Date.now()}`;

    // Header line: carries the menu price
    const header = {
      product_id: `menu-header-${uniqueId}`,
      product_name: selection.menu_name,
      unit_price: selection.menu_price,
      quantity: 1,
      notes: "",
      menu_id: uniqueId,
      menu_name: selection.menu_name,
      is_menu_header: true,
    };

    // Detail lines: individual products for kitchen (price = 0, included)
    const items = selection.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: 0,
      quantity: 1,
      notes: "",
      menu_id: uniqueId,
      menu_name: selection.menu_name,
    }));

    addMenuToCart(header, items);
  }

  async function handleSubmit() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      await createOrder({
        table_number: tableNumber,
        items: cart.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes || undefined,
          menu_id: item.menu_id,
          menu_name: item.menu_name,
          is_menu_header: item.is_menu_header,
        })),
      });
      clearCart();
      router.push("/commandes");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la création de la commande";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          render={<Link href="/commandes" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nouvelle commande — Table {tableNumber}
          </h1>
          <p className="text-muted-foreground">
            Sélectionnez les produits à ajouter
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Produits (2/3) */}
        <div className="space-y-4 lg:col-span-2">
          {/* Menus / Formules */}
          {menus.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4" />
                Menus & Formules
              </h3>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {menus.map((menu) => (
                  <Card
                    key={menu.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleOpenMenuSelection(menu)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">
                              {menu.name}
                            </span>
                            <Badge
                              variant={
                                menu.type === "formula"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-[10px] px-1 py-0 shrink-0"
                            >
                              {menu.type === "formula"
                                ? "Formule"
                                : "Menu"}
                            </Badge>
                          </div>
                          {menu.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {menu.description}
                            </p>
                          )}
                          {menu.items.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {[...new Set(menu.items.map((i) => i.label ?? i.course))].join(" · ")}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0 ml-2">
                          {Number(menu.price).toFixed(2)} €
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
          <ProductGrid products={products} onAddProduct={handleAddProduct} />
        </div>

        {/* Panier (1/3) */}
        <div>
          <OrderPanel
            cart={cart}
            tableNumber={tableNumber}
            onUpdateQuantity={updateCartQuantity}
            onRemoveItem={removeFromCart}
            onRemoveMenu={removeMenuFromCart}
            onSubmit={handleSubmit}
            onClear={clearCart}
            loading={submitting}
          />
        </div>
      </div>

      {/* Menu selection dialog */}
      <MenuSelectionDialog
        menu={selectedMenu}
        open={menuDialogOpen}
        onOpenChange={setMenuDialogOpen}
        onConfirm={handleMenuConfirm}
      />
    </div>
  );
}
