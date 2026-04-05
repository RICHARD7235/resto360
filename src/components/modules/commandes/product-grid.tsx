"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductGridProps {
  products: Tables<"products">[];
  onAddProduct: (product: Tables<"products">) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number): string {
  return price.toFixed(2) + " \u20AC";
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "\u2026";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductGrid({ products, onAddProduct }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
        Aucun produit dans cette cat\u00E9gorie
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const unavailable = !product.is_available;
        const hasAllergens =
          product.allergens !== null && product.allergens.length > 0;

        return (
          <Card
            key={product.id}
            size="sm"
            className={cn(
              "cursor-pointer transition-all hover:shadow-md active:scale-[0.97]",
              unavailable && "pointer-events-none opacity-50"
            )}
            onClick={() => {
              if (!unavailable) {
                onAddProduct(product);
              }
            }}
            role="button"
            tabIndex={unavailable ? -1 : 0}
            aria-disabled={unavailable}
            aria-label={`${product.name} — ${formatPrice(product.price)}`}
            onKeyDown={(e) => {
              if (!unavailable && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onAddProduct(product);
              }
            }}
          >
            <CardContent className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold leading-tight text-foreground">
                {product.name}
              </span>

              {product.description && (
                <span className="text-xs leading-snug text-muted-foreground">
                  {truncate(product.description, 60)}
                </span>
              )}

              <span className="text-sm font-bold text-primary">
                {formatPrice(product.price)}
              </span>

              {hasAllergens && (
                <Badge variant="secondary" className="w-fit text-[10px]">
                  Allerg\u00E8nes
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export type { ProductGridProps };
