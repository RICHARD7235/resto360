"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/types/database.types";

type CatalogItem = Tables<"supplier_catalog_items">;

export interface CatalogItemFormData {
  label: string;
  reference: string;
  unit: string;
  unit_price: number;
  category: string;
  is_available: boolean;
}

interface CatalogItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CatalogItem | null;
  onSubmit: (data: CatalogItemFormData) => Promise<void>;
}

const UNITS = [
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "L", label: "Litre (L)" },
  { value: "piece", label: "Pièce" },
  { value: "pack", label: "Pack / Lot" },
];

const CATEGORIES = [
  { value: "viandes", label: "Viandes" },
  { value: "poissons", label: "Poissons" },
  { value: "légumes", label: "Légumes" },
  { value: "produits_laitiers", label: "Produits laitiers" },
  { value: "boissons", label: "Boissons" },
  { value: "épicerie", label: "Épicerie" },
  { value: "autre", label: "Autre" },
];

const emptyForm: CatalogItemFormData = {
  label: "",
  reference: "",
  unit: "kg",
  unit_price: 0,
  category: "autre",
  is_available: true,
};

export function CatalogItemForm({
  open,
  onOpenChange,
  item,
  onSubmit,
}: CatalogItemFormProps) {
  const [form, setForm] = useState<CatalogItemFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEditing = !!item;

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              label: item.label,
              reference: item.reference || "",
              unit: item.unit,
              unit_price: Number(item.unit_price),
              category: item.category || "autre",
              is_available: item.is_available,
            }
          : emptyForm
      );
    }
  }, [open, item]);

  function updateField<K extends keyof CatalogItemFormData>(
    key: K,
    value: CatalogItemFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'article" : "Nouvel article catalogue"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Désignation *</Label>
            <Input
              id="label"
              value={form.label}
              onChange={(e) => updateField("label", e.target.value)}
              placeholder="Entrecôte Black Angus 300g"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Référence fournisseur</Label>
            <Input
              id="reference"
              value={form.reference}
              onChange={(e) => updateField("reference", e.target.value)}
              placeholder="REF-001"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unité *</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => updateField("unit", v ?? "kg")}
              >
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Prix unitaire HT (€) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0"
                value={form.unit_price}
                onChange={(e) => updateField("unit_price", parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select
              value={form.category}
              onValueChange={(v) => updateField("category", v ?? "")}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !form.label.trim()}>
              {saving ? "Enregistrement..." : isEditing ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
