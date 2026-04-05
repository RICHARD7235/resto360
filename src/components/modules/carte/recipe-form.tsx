"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Tables } from "@/types/database.types";
import type { RecipeWithIngredients } from "@/app/(dashboard)/carte/actions";

type Product = Tables<"products">;

interface IngredientInput {
  name: string;
  quantity: string;
  unit: string;
  unit_cost: string;
}

export interface RecipeFormData {
  name: string;
  description: string;
  product_id: string | null;
  portions: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  instructions: string;
  notes: string;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    unit_cost: number;
  }[];
}

const UNITS = ["g", "kg", "ml", "L", "pièce", "boule", "tranche", "feuille", "botte", "c.à.s", "c.à.c"];

interface RecipeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: RecipeWithIngredients | null;
  products: Product[];
  onSubmit: (data: RecipeFormData) => void;
  loading?: boolean;
}

export function RecipeForm({
  open,
  onOpenChange,
  recipe,
  products,
  onSubmit,
  loading = false,
}: RecipeFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [portions, setPortions] = useState("1");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setDescription(recipe.description ?? "");
      setProductId(recipe.product_id);
      setPortions(recipe.portions.toString());
      setPrepTime(recipe.prep_time_min?.toString() ?? "");
      setCookTime(recipe.cook_time_min?.toString() ?? "");
      setInstructions(recipe.instructions ?? "");
      setNotes(recipe.notes ?? "");
      setIngredients(
        recipe.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity.toString(),
          unit: ing.unit,
          unit_cost: ing.unit_cost.toString(),
        }))
      );
    } else {
      setName("");
      setDescription("");
      setProductId(null);
      setPortions("1");
      setPrepTime("");
      setCookTime("");
      setInstructions("");
      setNotes("");
      setIngredients([{ name: "", quantity: "", unit: "g", unit_cost: "" }]);
    }
  }, [recipe, open]);

  function addIngredient() {
    setIngredients((prev) => [
      ...prev,
      { name: "", quantity: "", unit: "g", unit_cost: "" },
    ]);
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateIngredient(
    index: number,
    field: keyof IngredientInput,
    value: string
  ) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  }

  const totalCost = ingredients.reduce((sum, ing) => {
    const qty = parseFloat(ing.quantity) || 0;
    const cost = parseFloat(ing.unit_cost) || 0;
    return sum + qty * cost;
  }, 0);

  const costPerPortion =
    parseInt(portions) > 0 ? totalCost / parseInt(portions) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      description,
      product_id: productId,
      portions: parseInt(portions) || 1,
      prep_time_min: prepTime ? parseInt(prepTime) : null,
      cook_time_min: cookTime ? parseInt(cookTime) : null,
      instructions,
      notes,
      ingredients: ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          name: ing.name,
          quantity: parseFloat(ing.quantity) || 0,
          unit: ing.unit,
          unit_cost: parseFloat(ing.unit_cost) || 0,
        })),
    });
  }

  function formatPrice(value: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {recipe ? "Modifier la fiche technique" : "Nouvelle fiche technique"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Informations générales */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipe-name">Nom de la recette *</Label>
              <Input
                id="recipe-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Travers de porc fumé"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipe-description">Description</Label>
              <Textarea
                id="recipe-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de la recette..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipe-product">Produit lié (carte)</Label>
              <Select
                value={productId ?? "none"}
                onValueChange={(v) => setProductId(v === "none" ? null : v)}
              >
                <SelectTrigger id="recipe-product">
                  <SelectValue placeholder="Aucun produit lié" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun produit lié</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({formatPrice(p.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="recipe-portions">Portions *</Label>
                <Input
                  id="recipe-portions"
                  type="number"
                  min="1"
                  value={portions}
                  onChange={(e) => setPortions(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipe-prep">Prépa (min)</Label>
                <Input
                  id="recipe-prep"
                  type="number"
                  min="0"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipe-cook">Cuisson (min)</Label>
                <Input
                  id="recipe-cook"
                  type="number"
                  min="0"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Ingrédients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Ingrédients</Label>
              <div className="text-sm text-muted-foreground">
                Total : {formatPrice(totalCost)} | Par portion :{" "}
                {formatPrice(costPerPortion)}
              </div>
            </div>

            <div className="space-y-2">
              {ingredients.map((ing, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={ing.name}
                    onChange={(e) =>
                      updateIngredient(index, "name", e.target.value)
                    }
                    placeholder="Ingrédient"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={ing.quantity}
                    onChange={(e) =>
                      updateIngredient(index, "quantity", e.target.value)
                    }
                    placeholder="Qté"
                    className="w-20"
                  />
                  <Select
                    value={ing.unit}
                    onValueChange={(v) => v && updateIngredient(index, "unit", v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={ing.unit_cost}
                    onChange={(e) =>
                      updateIngredient(index, "unit_cost", e.target.value)
                    }
                    placeholder="Coût/u"
                    className="w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-red-500 hover:text-red-700"
                    onClick={() => removeIngredient(index)}
                    disabled={ingredients.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Ajouter un ingrédient
            </Button>
          </div>

          <Separator />

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="recipe-instructions">Instructions</Label>
            <Textarea
              id="recipe-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Étapes de préparation..."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe-notes">Notes</Label>
            <Textarea
              id="recipe-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Points d'attention, astuces..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !name}>
              {loading
                ? "Enregistrement..."
                : recipe
                  ? "Mettre à jour"
                  : "Créer la fiche"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
