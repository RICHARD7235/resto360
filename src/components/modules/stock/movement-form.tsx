"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/types/database.types";

type StockItem = Tables<"stock_items">;

interface MovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItems: StockItem[];
  onSubmit: (data: {
    stock_item_id: string;
    type: string;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
}

const MOVEMENT_TYPES = [
  { value: "adjustment", label: "Ajustement" },
  { value: "waste", label: "Perte / Déchet" },
  { value: "return", label: "Retour fournisseur" },
  { value: "consumption", label: "Consommation manuelle" },
];

export function MovementForm({ open, onOpenChange, stockItems, onSubmit }: MovementFormProps) {
  const [stockItemId, setStockItemId] = useState("");
  const [type, setType] = useState("adjustment");
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Waste and consumption are negative
      const finalQty = ["waste", "consumption"].includes(type)
        ? -Math.abs(quantity)
        : quantity;
      await onSubmit({ stock_item_id: stockItemId, type, quantity: finalQty, notes: notes || undefined });
      onOpenChange(false);
      setStockItemId("");
      setType("adjustment");
      setQuantity(0);
      setNotes("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Mouvement manuel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stock_item">Article *</Label>
            <Select value={stockItemId} onValueChange={(v) => setStockItemId(v ?? "")}>
              <SelectTrigger id="stock_item"><SelectValue placeholder="Sélectionner un article" /></SelectTrigger>
              <SelectContent>
                {stockItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name} ({item.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? "adjustment")}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input id="quantity" type="number" step="0.01" min="0.01" value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving || !stockItemId || quantity <= 0}>
              {saving ? "Enregistrement..." : "Valider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
