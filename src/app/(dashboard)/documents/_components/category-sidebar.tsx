"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentCategory, DocumentWithStatus } from "@/types/documents";

interface CategorySidebarProps {
  categories: DocumentCategory[];
  documents: DocumentWithStatus[];
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategorySidebar({
  categories,
  documents,
  selected,
  onSelect,
}: CategorySidebarProps) {
  const counts = new Map<string, number>();
  for (const d of documents) {
    if (d.category_id) {
      counts.set(d.category_id, (counts.get(d.category_id) ?? 0) + 1);
    }
  }

  const items: { id: string | null; label: string; count: number }[] = [
    { id: null, label: "Toutes les catégories", count: documents.length },
    ...categories.map((c) => ({
      id: c.id,
      label: c.label,
      count: counts.get(c.id) ?? 0,
    })),
  ];

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = item.id === selected;
        return (
          <button
            key={item.id ?? "all"}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            )}
          >
            <span className="truncate">{item.label}</span>
            <Badge
              variant={active ? "secondary" : "outline"}
              className="ml-2"
            >
              {item.count}
            </Badge>
          </button>
        );
      })}
    </nav>
  );
}
