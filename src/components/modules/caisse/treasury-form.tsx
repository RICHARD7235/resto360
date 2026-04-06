"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTreasuryEntry } from "@/app/(dashboard)/caisse/actions";
import type { TreasuryEntry, TreasuryCategory, TreasuryType } from "@/types/caisse";
import { TREASURY_CATEGORY_LABELS } from "@/types/caisse";

const CATEGORIES = Object.entries(TREASURY_CATEGORY_LABELS) as [TreasuryCategory, string][];

const today = new Date().toISOString().split("T")[0];

interface FormState {
  date: string;
  type: TreasuryType;
  category: TreasuryCategory;
  label: string;
  amount: string;
}

const defaultForm: FormState = {
  date: today,
  type: "income",
  category: "other",
  label: "",
  amount: "",
};

interface TreasuryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (entry: TreasuryEntry) => void;
}

export function TreasuryForm({ open, onOpenChange, onCreated }: TreasuryFormProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Le montant doit être un nombre positif");
      return;
    }
    if (!form.label.trim()) {
      toast.error("Le libellé est obligatoire");
      return;
    }

    setLoading(true);
    try {
      const entry = await createTreasuryEntry({
        entry_date: form.date,
        type: form.type,
        category: form.category,
        label: form.label.trim(),
        amount,
        source_module: null,
        source_id: null,
      });
      toast.success("Écriture créée");
      onCreated(entry);
      onOpenChange(false);
      setForm(defaultForm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle écriture manuelle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="te-date">Date</Label>
            <Input
              id="te-date"
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="h-11"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={form.type === "income" ? "default" : "outline"}
                className={`h-11 flex-1 ${form.type === "income" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                onClick={() => set("type", "income")}
              >
                Entrée
              </Button>
              <Button
                type="button"
                variant={form.type === "expense" ? "default" : "outline"}
                className={`h-11 flex-1 ${form.type === "expense" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                onClick={() => set("type", "expense")}
              >
                Sortie
              </Button>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="te-category">Catégorie</Label>
            <Select
              value={form.category}
              onValueChange={(v) => set("category", v as TreasuryCategory)}
            >
              <SelectTrigger id="te-category" className="h-11">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="te-label">Libellé</Label>
            <Input
              id="te-label"
              type="text"
              placeholder="Ex : Achat fournitures bureau"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              className="h-11"
              required
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="te-amount">Montant (€)</Label>
            <Input
              id="te-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              className="h-11"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="h-11 min-w-[120px] bg-[#E85D26] hover:bg-[#D04E1A] text-white"
              disabled={loading}
            >
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
