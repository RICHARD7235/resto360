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

type StockItem = Tables<"stock_items">;

export interface StockItemFormData {
  name: string;
  category: string;
  unit: string;
  current_quantity: number;
  alert_threshold: number;
  optimal_quantity: number;
  tracking_mode: string;
  unit_cost: number;
}

interface StockItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: StockItem | null;
  onSubmit: (data: StockItemFormData) => Promise<void>;
}

const UNITS = [
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "g", label: "Gramme (g)" },
  { value: "L", label: "Litre (L)" },
  { value: "cl", label: "Centilitre (cl)" },
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

const emptyForm: StockItemFormData = {
  name: "",
  category: "autre",
  unit: "kg",
  current_quantity: 0,
  alert_threshold: 0,
  optimal_quantity: 0,
  tracking_mode: "lot",
  unit_cost: 0,
};

export function StockItemForm({ open, onOpenChange, item, onSubmit }: StockItemFormProps) {
  const [form, setForm] = useState<StockItemFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEditing = !!item;

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              name: item.name,
              category: item.category || "autre",
              unit: item.unit,
              current_quantity: Number(item.current_quantity),
              alert_threshold: Number(item.alert_threshold),
              optimal_quantity: Number(item.optimal_quantity),
              tracking_mode: item.tracking_mode,
              unit_cost: Number(item.unit_cost),
            }
          : emptyForm
      );
    }
  }, [open, item]);

  function updateField<K extends keyof StockItemFormData>(key: K, value: StockItemFormData[K]) {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier l'article" : "Nouvel article de stock"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => updateField("category", v ?? "")}>
                <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unité *</Label>
              <Select value={form.unit} onValueChange={(v) => updateField("unit", v ?? "kg")}>
                <SelectTrigger id="unit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_quantity">Quantité actuelle</Label>
              <Input id="current_quantity" type="number" step="0.01" value={form.current_quantity}
                onChange={(e) => updateField("current_quantity", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert_threshold">Seuil alerte</Label>
              <Input id="alert_threshold" type="number" step="0.01" value={form.alert_threshold}
                onChange={(e) => updateField("alert_threshold", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="optimal_quantity">Quantité optimale</Label>
              <Input id="optimal_quantity" type="number" step="0.01" value={form.optimal_quantity}
                onChange={(e) => updateField("optimal_quantity", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tracking_mode">Mode de suivi</Label>
              <Select value={form.tracking_mode} onValueChange={(v) => updateField("tracking_mode", v ?? "lot")}>
                <SelectTrigger id="tracking_mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lot">Lot (inventaire périodique)</SelectItem>
                  <SelectItem value="ingredient">Ingrédient (déduction auto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Coût unitaire (€)</Label>
              <Input id="unit_cost" type="number" step="0.01" min="0" value={form.unit_cost}
                onChange={(e) => updateField("unit_cost", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "Enregistrement..." : isEditing ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
