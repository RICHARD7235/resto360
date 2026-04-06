"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuWithItems } from "@/app/(dashboard)/commandes/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MenuSelection {
  menu_id: string;
  menu_name: string;
  menu_price: number;
  items: {
    product_id: string;
    product_name: string;
    course: string;
  }[];
}

interface MenuSelectionDialogProps {
  menu: MenuWithItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selection: MenuSelection) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MenuSelectionDialog({
  menu,
  open,
  onOpenChange,
  onConfirm,
}: MenuSelectionDialogProps) {
  // Track selected product_id per course
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Reset selections when menu changes
  useEffect(() => {
    if (!menu || !open) return;

    const defaults: Record<string, string> = {};
    const courseMap = groupByCourse(menu);

    for (const [course, items] of Object.entries(courseMap)) {
      // Auto-select if only one option, or pick is_default
      const defaultItem = items.find((i) => i.is_default) ?? (items.length === 1 ? items[0] : null);
      if (defaultItem?.product?.id) {
        defaults[course] = defaultItem.product.id;
      }
    }
    setSelections(defaults);
  }, [menu, open]);

  if (!menu) return null;

  const courseMap = groupByCourse(menu);
  const courses = Object.entries(courseMap);

  // Check all required courses have a selection
  const requiredCourses = courses.filter(([, items]) =>
    items.some((i) => i.is_required !== false)
  );
  const allSelected = requiredCourses.every(([course]) => selections[course]);

  function handleSelect(course: string, productId: string) {
    setSelections((prev) => ({ ...prev, [course]: productId }));
  }

  function handleConfirm() {
    if (!menu) return;

    const items: MenuSelection["items"] = [];

    for (const [course, productId] of Object.entries(selections)) {
      const courseItems = courseMap[course] ?? [];
      const selected = courseItems.find((i) => i.product?.id === productId);
      if (selected?.product) {
        items.push({
          product_id: selected.product.id,
          product_name: selected.product.name,
          course,
        });
      }
    }

    onConfirm({
      menu_id: menu.id,
      menu_name: menu.name,
      menu_price: menu.price,
      items,
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{menu.name}</DialogTitle>
          <DialogDescription>
            {menu.description ?? "Composez votre menu en choisissant un plat par catégorie."}
            <span className="block mt-1 font-semibold text-foreground">
              {menu.price.toFixed(2)} ��
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {courses.map(([course, items]) => {
            const label = items[0]?.label ?? course;
            const isRequired = items.some((i) => i.is_required !== false);

            return (
              <div key={course}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  {isRequired && (
                    <Badge variant="outline" className="text-[10px]">
                      Obligatoire
                    </Badge>
                  )}
                  {selections[course] && (
                    <Check className="size-4 text-green-600" />
                  )}
                </div>

                <div className="grid gap-2">
                  {items.map((item) => {
                    if (!item.product) return null;
                    const isSelected = selections[course] === item.product.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(course, item.product!.id)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium">
                            {item.product.name}
                          </span>
                          {item.product.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {item.product.description}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="size-5 text-primary shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={!allSelected}
            onClick={handleConfirm}
          >
            Ajouter au panier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByCourse(menu: MenuWithItems) {
  const courseMap: Record<string, MenuWithItems["items"]> = {};

  for (const item of menu.items) {
    const course = item.course ?? item.label ?? "Plat";
    if (!courseMap[course]) courseMap[course] = [];
    courseMap[course].push(item);
  }

  return courseMap;
}
