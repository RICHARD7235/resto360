"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { createPromotion } from "@/app/(dashboard)/marketing/actions";
import type { PromotionDiscountType } from "@/types/marketing";

export function NewPromotionForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const initial = {
    code: "",
    description: "",
    discount_type: "percent" as PromotionDiscountType,
    discount_value: 10,
    starts_at: today,
    ends_at: in30,
    max_uses: "" as string,
  };
  const [form, setForm] = useState(initial);

  const submit = () => {
    startTransition(async () => {
      await createPromotion({
        code: form.code,
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        is_active: true,
      });
      setOpen(false);
      setForm(initial);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle promo
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un code promo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Code (ex: BIENVENUE)"
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
          />
          <Textarea
            placeholder="Description (optionnel)"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={form.discount_type}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  discount_type: (v ?? "percent") as PromotionDiscountType,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Pourcentage (%)</SelectItem>
                <SelectItem value="amount">Montant (€)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="Valeur"
              value={form.discount_value}
              onChange={(e) =>
                setForm({ ...form, discount_value: Number(e.target.value) })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Début</p>
              <Input
                type="date"
                value={form.starts_at}
                onChange={(e) =>
                  setForm({ ...form, starts_at: e.target.value })
                }
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Fin</p>
              <Input
                type="date"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </div>
          </div>
          <Input
            type="number"
            min="1"
            placeholder="Nombre max d'utilisations (optionnel)"
            value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !form.code || form.discount_value <= 0}
          >
            {pending ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
