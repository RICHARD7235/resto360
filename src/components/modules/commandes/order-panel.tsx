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
  onRemoveMenu: (menuId: string) => void;
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

interface MenuGroup {
  type: "menu";
  menu_id: string;
  menu_name: string;
  header: CartItem;
  items: CartItem[];
}

interface SingleItem {
  type: "single";
  item: CartItem;
}

type CartEntry = MenuGroup | SingleItem;

function groupCartEntries(cart: CartItem[]): CartEntry[] {
  const entries: CartEntry[] = [];
  const menuGroups = new Map<string, MenuGroup>();
  const processedMenuIds = new Set<string>();

  for (const item of cart) {
    if (item.menu_id) {
      if (!menuGroups.has(item.menu_id)) {
        menuGroups.set(item.menu_id, {
          type: "menu",
          menu_id: item.menu_id,
          menu_name: item.menu_name ?? "Menu",
          header: item, // will be overwritten if header found
          items: [],
        });
      }
      const group = menuGroups.get(item.menu_id)!;
      if (item.is_menu_header) {
        group.header = item;
      } else {
        group.items.push(item);
      }
    }
  }

  // Build ordered entries
  for (const item of cart) {
    if (item.menu_id) {
      if (!processedMenuIds.has(item.menu_id)) {
        processedMenuIds.add(item.menu_id);
        const group = menuGroups.get(item.menu_id);
        if (group) entries.push(group);
      }
    } else {
      entries.push({ type: "single", item });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderPanel({
  cart,
  tableNumber,
  onUpdateQuantity,
  onRemoveItem,
  onRemoveMenu,
  onSubmit,
  onClear,
  loading = false,
}: OrderPanelProps) {
  const total = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const isEmpty = cart.length === 0;
  const entries = groupCartEntries(cart);

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
            {entries.map((entry) => {
              if (entry.type === "menu") {
                return (
                  <MenuGroupRow
                    key={entry.menu_id}
                    group={entry}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemoveMenu={onRemoveMenu}
                  />
                );
              }
              return (
                <SingleItemRow
                  key={entry.item.product_id}
                  item={entry.item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemoveItem={onRemoveItem}
                />
              );
            })}
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SingleItemRow({
  item,
  onUpdateQuantity,
  onRemoveItem,
}: {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
}) {
  return (
    <li className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {item.product_name}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatPrice(item.unit_price)} / unité
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
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
          onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <span className="w-16 text-right text-sm font-semibold tabular-nums text-foreground">
        {formatPrice(item.unit_price * item.quantity)}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="min-h-11 min-w-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => onRemoveItem(item.product_id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

function MenuGroupRow({
  group,
  onUpdateQuantity,
  onRemoveMenu,
}: {
  group: MenuGroup;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveMenu: (menuId: string) => void;
}) {
  const { header, items, menu_name } = group;

  return (
    <li className="rounded-lg border border-primary/20 bg-primary/5 p-2 space-y-1.5">
      {/* Menu header */}
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-primary">
            {menu_name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatPrice(header.unit_price)} / menu
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={() =>
              onUpdateQuantity(header.product_id, header.quantity - 1)
            }
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {header.quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={() =>
              onUpdateQuantity(header.product_id, header.quantity + 1)
            }
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <span className="w-16 text-right text-sm font-semibold tabular-nums text-foreground">
          {formatPrice(header.unit_price * header.quantity)}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRemoveMenu(group.menu_id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* Menu items (included, price = 0) */}
      {items.length > 0 && (
        <div className="ml-3 border-l-2 border-primary/20 pl-3 space-y-0.5">
          {items.map((item) => (
            <div
              key={item.product_id}
              className="flex items-center justify-between text-xs text-muted-foreground"
            >
              <span className="truncate">{item.product_name}</span>
              <span className="shrink-0 text-green-600 font-medium">
                inclus
              </span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

export type { OrderPanelProps };
