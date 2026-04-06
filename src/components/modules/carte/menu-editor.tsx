"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AllergenList } from "./allergen-badge";
import type { Tables } from "@/types/database.types";

type Product = Tables<"products">;
type MenuCategory = Tables<"menu_categories">;
type Station = Tables<"preparation_stations">;

interface MenuEditorProps {
  categories: MenuCategory[];
  products: Product[];
  stations?: Station[];
  onToggleAvailability: (id: string, available: boolean) => void;
  onEditProduct: (id: string) => void;
  onDeleteProduct: (id: string) => void;
  onNewProduct: (categoryId: string) => void;
  onUpdateCategoryStation?: (categoryId: string, stationId: string | null) => void;
}

export function MenuEditor({
  categories,
  products,
  stations,
  onToggleAvailability,
  onEditProduct,
  onDeleteProduct,
  onNewProduct,
  onUpdateCategoryStation,
}: MenuEditorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getProductsByCategory(categoryId: string) {
    return products
      .filter((p) => p.category_id === categoryId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  }

  function getFoodCostRatio(product: Product) {
    if (!product.cost_price || product.cost_price <= 0 || product.price <= 0)
      return null;
    return Math.round((product.cost_price / product.price) * 100);
  }

  function getFoodCostColor(ratio: number) {
    if (ratio <= 25) return "text-green-600";
    if (ratio <= 35) return "text-amber-600";
    return "text-red-600";
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const catProducts = getProductsByCategory(category.id);
        const isExpanded = expandedCategories.has(category.id);
        const availableCount = catProducts.filter(
          (p) => p.is_available
        ).length;

        return (
          <Card key={category.id}>
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-xl"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <Badge variant="secondary">
                  {availableCount}/{catProducts.length} dispo
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {stations && stations.length > 0 && onUpdateCategoryStation && (
                  <Select
                    value={category.default_station_id ?? "none"}
                    onValueChange={(v) => {
                      onUpdateCategoryStation(
                        category.id,
                        !v || v === "none" ? null : v
                      );
                    }}
                  >
                    <SelectTrigger
                      className="h-8 w-44 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue placeholder="Poste de preparation" />
                    </SelectTrigger>
                    <SelectContent onClick={(e) => e.stopPropagation()}>
                      <SelectItem value="none">Aucun poste</SelectItem>
                      {stations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewProduct(category.id);
                  }}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </button>

            {isExpanded && (
              <CardContent className="pt-0 pb-3">
                {catProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Aucun produit dans cette catégorie
                  </p>
                ) : (
                  <div className="space-y-1">
                    {catProducts.map((product) => {
                      const ratio = getFoodCostRatio(product);
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group ${
                            !product.is_available ? "opacity-50" : ""
                          }`}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {product.name}
                              </span>
                              {!product.is_available && (
                                <Badge
                                  variant="outline"
                                  className="text-red-600 border-red-200"
                                >
                                  Indisponible
                                </Badge>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-sm text-muted-foreground truncate mt-0.5">
                                {product.description}
                              </p>
                            )}
                            {product.allergens && product.allergens.length > 0 && (
                              <div className="mt-1">
                                <AllergenList
                                  allergens={product.allergens}
                                  compact
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {ratio !== null && (
                              <div className="text-right hidden sm:block">
                                <div className="text-xs text-muted-foreground">
                                  Coût matière
                                </div>
                                <div
                                  className={`text-sm font-medium ${getFoodCostColor(ratio)}`}
                                >
                                  {ratio}%
                                </div>
                              </div>
                            )}

                            <div className="text-right">
                              <div className="font-semibold text-base">
                                {formatPrice(product.price)}
                              </div>
                              {product.cost_price !== null &&
                                product.cost_price > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    coût {formatPrice(product.cost_price)}
                                  </div>
                                )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  />
                                }
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => onEditProduct(product.id)}
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onToggleAvailability(
                                      product.id,
                                      !product.is_available
                                    )
                                  }
                                >
                                  {product.is_available ? (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-2" />
                                      Rendre indisponible
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Rendre disponible
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => onDeleteProduct(product.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
