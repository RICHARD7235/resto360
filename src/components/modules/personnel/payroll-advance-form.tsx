"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { createPayrollAdvance } from "@/app/(dashboard)/personnel/actions";
import type { PaymentMethod } from "@/types/personnel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PayrollAdvanceFormProps {
  open: boolean;
  onClose: () => void;
  staffMemberId: string;
  onSave: () => void;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

interface FormState {
  date: string;
  amount: string;
  payment_method: PaymentMethod;
  notes: string;
}

function initialState(): FormState {
  return {
    date: todayISO(),
    amount: "",
    payment_method: "virement",
    notes: "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PayrollAdvanceForm({
  open,
  onClose,
  staffMemberId,
  onSave,
}: PayrollAdvanceFormProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function handlePaymentMethodChange(value: string | null) {
    if (value === "virement" || value === "especes") {
      setForm((prev) => ({ ...prev, payment_method: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (!form.date) {
      toast.error("Date requise");
      return;
    }

    setSaving(true);
    try {
      await createPayrollAdvance({
        staff_member_id: staffMemberId,
        date: form.date,
        amount,
        payment_method: form.payment_method,
        notes: form.notes,
      });
      toast.success("Acompte enregistré");
      setForm(initialState());
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setForm(initialState());
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouvel acompte</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="advance-date">Date</Label>
            <Input
              id="advance-date"
              type="date"
              value={form.date}
              onChange={handleChange("date")}
              className="min-h-11"
              required
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="advance-amount">Montant (€)</Label>
            <Input
              id="advance-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange("amount")}
              className="min-h-11"
              required
            />
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <Label>Méthode de paiement</Label>
            <Select
              value={form.payment_method}
              onValueChange={handlePaymentMethodChange}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder="Choisir une méthode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virement">Virement</SelectItem>
                <SelectItem value="especes">Espèces</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="advance-notes">Notes</Label>
            <Textarea
              id="advance-notes"
              placeholder="Commentaire optionnel…"
              value={form.notes}
              onChange={handleChange("notes")}
              rows={3}
            />
          </div>

          <SheetFooter className="p-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-11 flex-1"
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="min-h-11 flex-1"
              disabled={saving}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
