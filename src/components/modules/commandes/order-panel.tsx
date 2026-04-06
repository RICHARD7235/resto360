"use client";

import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/stores/commandes.store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderPanelProps {
  cart: CartItem[];
  tableNumber: string;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onSubmit: () => Promise<void>;
  onClear: () => void;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(amount: number): string {
  return amount.toFixed(2) + " €";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderPanel({
  cart,
  tableNumber,
  onUpdateQuantity,
  onRemoveItem,
  onSubmit,
  onClear,
  loading = false,
}: OrderPanelProps) {
  const total = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const isEmpty = cart.length === 0;

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card text-card-foreground">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">
          Commande &mdash; Table {tableNumber}
        </h2>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isEmpty ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ajoutez des produits à la commande
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cart.map((item) => (
              <li
                key={item.product_id}
                className="flex items-center gap-2"
              >
                {/* Product name + unit price */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {item.product_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.menu_name ? (
                      <span className="text-primary">{item.menu_name} &middot; </span>
                    ) : null}
                    {formatPrice(item.unit_price)} / unité
                  </span>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11"
                    onClick={() =>
                      onUpdateQuantity(item.product_id, item.quantity - 1)
                    }
                    aria-label={`Réduire ${item.product_name}`}
                  >
                    <Minus className="size-4" />
                  </Button>

                  <span className="w-8 text-center text-sm font-semibold tabular-nums">
                    {item.quantity}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    className="min-h-11 min-w-11"
                    onClick={() =>
                      onUpdateQuantity(item.product_id, item.quantity + 1)
                    }
                    aria-label={`Augmenter ${item.product_name}`}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                {/* Line total */}
                <span className="w-16 text-right text-sm font-semibold tabular-nums text-foreground">
                  {formatPrice(item.unit_price * item.quantity)}
                </span>

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onRemoveItem(item.product_id)}
                  aria-label={`Supprimer ${item.product_name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: total + actions */}
      <div className="border-t px-4 py-3">
        {/* Total */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Total
          </span>
          <span className="text-lg font-bold text-foreground">
            {formatPrice(total)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={onClear}
            disabled={isEmpty || loading}
          >
            Vider
          </Button>

          <Button
            className={cn("min-h-11 flex-1")}
            onClick={onSubmit}
            disabled={isEmpty || loading}
          >
            {loading ? "Envoi en cours…" : "Envoyer en cuisine"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { OrderPanelProps };
