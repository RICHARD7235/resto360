"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCommandesStore } from "@/stores/commandes.store";
import { CategoryTabs } from "@/components/modules/commandes/category-tabs";
import { ProductGrid } from "@/components/modules/commandes/product-grid";
import { OrderPanel } from "@/components/modules/commandes/order-panel";
import { getMenuCategories, getProducts, createOrder } from "../actions";
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
    removeFromCart,
    updateCartQuantity,
    clearCart,
  } = useCommandesStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Charger les catégories au montage
  useEffect(() => {
    getMenuCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0 && !activeCategory) {
        setActiveCategory(cats[0].id);
      }
      setLoading(false);
    });
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
        })),
      });
      clearCart();
      router.push("/commandes");
    } catch (error) {
      console.error("Erreur création commande:", error);
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
            onSubmit={handleSubmit}
            onClear={clearCart}
            loading={submitting}
          />
        </div>
      </div>
    </div>
  );
}
