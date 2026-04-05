"use client";

import { ChefHat, Clock, FileText, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AllergenList } from "./allergen-badge";
import type { RecipeWithIngredients } from "@/app/(dashboard)/carte/actions";

interface RecipeDetailProps {
  recipe: RecipeWithIngredients | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatTime(minutes: number | null) {
  if (!minutes) return "-";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

export function RecipeDetail({
  recipe,
  open,
  onOpenChange,
  onEdit,
}: RecipeDetailProps) {
  if (!recipe) return null;

  const totalCost = recipe.ingredients.reduce(
    (sum, ing) => sum + ing.quantity * ing.unit_cost,
    0
  );
  const costPerPortion =
    recipe.portions > 0 ? totalCost / recipe.portions : 0;
  const sellingPrice = recipe.product?.price ?? 0;
  const ratio =
    sellingPrice > 0
      ? Math.round((costPerPortion / sellingPrice) * 100)
      : null;
  const margin = sellingPrice > 0 ? sellingPrice - costPerPortion : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{recipe.name}</SheetTitle>
          {recipe.description && (
            <p className="text-sm text-muted-foreground">
              {recipe.description}
            </p>
          )}
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* KPI rapides */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">Préparation</div>
                <div className="font-semibold">
                  {formatTime(recipe.prep_time_min)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">Cuisson</div>
                <div className="font-semibold">
                  {formatTime(recipe.cook_time_min)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <ChefHat className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">Portions</div>
                <div className="font-semibold">{recipe.portions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">Ingrédients</div>
                <div className="font-semibold">
                  {recipe.ingredients.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coûts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Analyse des coûts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Coût total recette
                </span>
                <span className="font-medium">{formatPrice(totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Coût par portion
                </span>
                <span className="font-semibold">
                  {formatPrice(costPerPortion)}
                </span>
              </div>
              {sellingPrice > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prix de vente</span>
                    <span className="font-medium">
                      {formatPrice(sellingPrice)}
                    </span>
                  </div>
                  {margin !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Marge brute</span>
                      <span className="font-semibold text-green-600">
                        {formatPrice(margin)}
                      </span>
                    </div>
                  )}
                  {ratio !== null && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        Ratio coût matière
                      </span>
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
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Ingrédients */}
          {recipe.ingredients.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ingrédients</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingrédient</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead className="text-right">Coût unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipe.ingredients.map((ing) => (
                      <TableRow key={ing.id}>
                        <TableCell className="font-medium">
                          {ing.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {ing.quantity} {ing.unit}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatPrice(ing.unit_cost)}/{ing.unit}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(ing.quantity * ing.unit_cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(totalCost)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Allergènes du produit lié */}
          {recipe.product?.allergens &&
            recipe.product.allergens.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Allergènes</CardTitle>
                </CardHeader>
                <CardContent>
                  <AllergenList allergens={recipe.product.allergens} />
                </CardContent>
              </Card>
            )}

          {/* Instructions */}
          {recipe.instructions && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-line leading-relaxed">
                  {recipe.instructions}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {recipe.notes && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-amber-800">
                  Note : {recipe.notes}
                </p>
              </CardContent>
            </Card>
          )}

          <Button onClick={onEdit} className="w-full">
            Modifier cette fiche
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
