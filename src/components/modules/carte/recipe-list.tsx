"use client";

import {
  BookOpen,
  ChefHat,
  Clock,
  Edit2,
  MoreHorizontal,
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
import type { RecipeWithIngredients } from "@/app/(dashboard)/carte/actions";

interface RecipeListProps {
  recipes: RecipeWithIngredients[];
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function computeTotalCost(recipe: RecipeWithIngredients): number {
  return recipe.ingredients.reduce(
    (sum, ing) => sum + ing.quantity * ing.unit_cost,
    0
  );
}

function computeCostPerPortion(recipe: RecipeWithIngredients): number {
  const total = computeTotalCost(recipe);
  return recipe.portions > 0 ? total / recipe.portions : 0;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatTime(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

export function RecipeList({
  recipes,
  onSelect,
  onEdit,
  onDelete,
}: RecipeListProps) {
  if (recipes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Aucune fiche technique</p>
          <p className="text-sm">
            Créez votre première fiche pour calculer vos coûts matière
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => {
        const costPerPortion = computeCostPerPortion(recipe);
        const sellingPrice = recipe.product?.price ?? 0;
        const ratio =
          sellingPrice > 0
            ? Math.round((costPerPortion / sellingPrice) * 100)
            : null;
        const totalTime =
          (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);

        return (
          <Card
            key={recipe.id}
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => onSelect(recipe.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{recipe.name}</h3>
                  {recipe.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {recipe.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(recipe.id);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(recipe.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                {totalTime > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(totalTime)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <ChefHat className="h-3.5 w-3.5" />
                  {recipe.portions} portion{recipe.portions > 1 ? "s" : ""}
                </span>
                <span>{recipe.ingredients.length} ingrédients</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Coût / portion
                  </div>
                  <div className="font-semibold">
                    {formatPrice(costPerPortion)}
                  </div>
                </div>
                {sellingPrice > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      Prix vente
                    </div>
                    <div className="font-semibold">
                      {formatPrice(sellingPrice)}
                    </div>
                  </div>
                )}
                {ratio !== null && (
                  <Badge
                    variant="outline"
                    className={
                      ratio <= 25
                        ? "bg-green-50 text-green-700 border-green-200"
                        : ratio <= 35
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                    }
                  >
                    {ratio}%
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
