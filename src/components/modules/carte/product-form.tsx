"use client";

import { useEffect, useState } from "react";
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
import { ALL_ALLERGENS, AllergenBadge } from "./allergen-badge";
import type { Tables } from "@/types/database.types";

type Product = Tables<"products">;
type MenuCategory = Tables<"menu_categories">;

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  cost_price: number | null;
  category_id: string;
  allergens: string[];
  is_available: boolean;
  station_id: string | null;
}

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: MenuCategory[];
  defaultCategoryId?: string;
  onSubmit: (data: ProductFormData) => void;
  loading?: boolean;
  stations?: Tables<"preparation_stations">[];
}

export function ProductForm({
  open,
  onOpenChange,
  product,
  categories,
  defaultCategoryId,
  onSubmit,
  loading = false,
  stations,
}: ProductFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [stationId, setStationId] = useState<string>("");

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setPrice(product.price.toString());
      setCostPrice(product.cost_price?.toString() ?? "");
      setCategoryId(product.category_id ?? "");
      setAllergens(product.allergens ?? []);
      setIsAvailable(product.is_available ?? true);
      setStationId(product.station_id ?? "");
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setCostPrice("");
      setCategoryId(defaultCategoryId ?? categories[0]?.id ?? "");
      setAllergens([]);
      setIsAvailable(true);
      setStationId("");
    }
  }, [product, open, defaultCategoryId, categories]);

  function toggleAllergen(allergen: string) {
    setAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      description,
      price: parseFloat(price) || 0,
      cost_price: costPrice ? parseFloat(costPrice) : null,
      category_id: categoryId,
      allergens,
      is_available: isAvailable,
      station_id: stationId || null,
    });
  }

  const foodCostRatio =
    costPrice && price
      ? Math.round((parseFloat(costPrice) / parseFloat(price)) * 100)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Modifier le produit" : "Nouveau produit"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Nom du produit *</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Travers de porc fumé"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description courte pour la carte..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-category">Catégorie *</Label>
            <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
              <SelectTrigger id="product-category">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {stations && stations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="product-station">Poste de preparation</Label>
              <Select value={stationId || "none"} onValueChange={(v) => setStationId(!v || v === "none" ? "" : v)}>
                <SelectTrigger id="product-station">
                  <SelectValue placeholder="Poste de la categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Poste de la categorie</SelectItem>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Laissez vide pour utiliser le poste de la categorie
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-price">Prix de vente (EUR) *</Label>
              <Input
                id="product-price"
                type="number"
                step="0.10"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-cost">Coût matière (EUR)</Label>
              <Input
                id="product-cost"
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
              />
              {foodCostRatio !== null && (
                <p
                  className={`text-xs font-medium ${
                    foodCostRatio <= 25
                      ? "text-green-600"
                      : foodCostRatio <= 35
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  Ratio coût matière : {foodCostRatio}%
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Allergènes</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ALLERGENS.map((allergen) => (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => toggleAllergen(allergen)}
                  className={`transition-all ${
                    allergens.includes(allergen)
                      ? "ring-2 ring-primary ring-offset-1 rounded-full"
                      : "opacity-40 hover:opacity-70"
                  }`}
                >
                  <AllergenBadge allergen={allergen} compact />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="product-available"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="product-available">Disponible à la vente</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !name || !price}>
              {loading
                ? "Enregistrement..."
                : product
                  ? "Mettre à jour"
                  : "Créer le produit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
