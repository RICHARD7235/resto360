"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryTabsProps {
  categories: Tables<"menu_categories">[];
  activeCategory: string | null;
  onSelectCategory: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CategoryTabs({
  categories,
  activeCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  // Auto-select first category when none is active
  useEffect(() => {
    if (activeCategory === null && categories.length > 0) {
      onSelectCategory(categories[0].id);
    }
  }, [activeCategory, categories, onSelectCategory]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Catégories du menu"
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
    >
      {categories.map((category) => {
        const isActive = category.id === activeCategory;

        return (
          <Button
            key={category.id}
            variant={isActive ? "default" : "outline"}
            className={cn(
              "min-h-11 shrink-0 px-4 text-sm font-medium",
              isActive && "bg-primary text-white hover:bg-primary/90"
            )}
            onClick={() => onSelectCategory(category.id)}
            aria-pressed={isActive}
          >
            {category.name}
          </Button>
        );
      })}
    </nav>
  );
}

export type { CategoryTabsProps };
