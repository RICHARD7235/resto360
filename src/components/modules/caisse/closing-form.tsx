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
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { createClosing } from "@/app/(dashboard)/caisse/actions";
import type { CashRegisterClosing } from "@/types/caisse";

interface ClosingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (closing: CashRegisterClosing) => void;
}

interface FormState {
  date: string;
  total_ttc: string;
  total_ht: string;
  total_cb: string;
  total_cash: string;
  total_check: string;
  total_ticket_resto: string;
  total_other: string;
  cover_count: string;
  ticket_count: string;
  vat_5_5: string;
  vat_10: string;
  vat_20: string;
  notes: string;
}

const today = new Date().toISOString().split("T")[0];

const defaultForm: FormState = {
  date: today,
  total_ttc: "",
  total_ht: "",
  total_cb: "",
  total_cash: "",
  total_check: "",
  total_ticket_resto: "",
  total_other: "",
  cover_count: "",
  ticket_count: "",
  vat_5_5: "",
  vat_10: "",
  vat_20: "",
  notes: "",
};

function parseNum(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export function ClosingForm({ open, onOpenChange, onCreated }: ClosingFormProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(false);

  const totalTtc = parseNum(form.total_ttc);
  const paymentSum =
    parseNum(form.total_cb) +
    parseNum(form.total_cash) +
    parseNum(form.total_check) +
    parseNum(form.total_ticket_resto) +
    parseNum(form.total_other);

  const paymentMismatch =
    totalTtc > 0 && Math.abs(paymentSum - totalTtc) > 0.01;

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function handleOpenChange(val: boolean) {
    if (!loading) {
      onOpenChange(val);
      if (!val) setForm(defaultForm);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date) {
      toast.error("La date est obligatoire");
      return;
    }
    if (paymentMismatch) {
      toast.error("La somme des paiements ne correspond pas au CA TTC");
      return;
    }
    setLoading(true);
    try {
      const closing = await createClosing({
        closing_date: form.date,
        total_ttc: parseNum(form.total_ttc),
        total_ht: parseNum(form.total_ht),
        total_cb: parseNum(form.total_cb),
        total_cash: parseNum(form.total_cash),
        total_check: parseNum(form.total_check),
        total_ticket_resto: parseNum(form.total_ticket_resto),
        total_other: parseNum(form.total_other),
        cover_count: parseInt(form.cover_count) || 0,
        ticket_count: parseInt(form.ticket_count) || 0,
        vat_5_5: parseNum(form.vat_5_5),
        vat_10: parseNum(form.vat_10),
        vat_20: parseNum(form.vat_20),
        notes: form.notes.trim() || null,
        extra_data: {},
        source: "manual",
      });
      toast.success("Z de caisse enregistré");
      onCreated(closing);
      onOpenChange(false);
      setForm(defaultForm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saisie manuelle — Z de caisse</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="closing-date">Date *</Label>
            <Input
              id="closing-date"
              type="date"
              value={form.date}
              onChange={set("date")}
              required
              className="min-h-[44px]"
            />
          </div>

          {/* CA TTC / HT */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="total-ttc">CA TTC (€)</Label>
              <Input
                id="total-ttc"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.total_ttc}
                onChange={set("total_ttc")}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="total-ht">CA HT (€)</Label>
              <Input
                id="total-ht"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.total_ht}
                onChange={set("total_ht")}
                className="min-h-[44px]"
              />
            </div>
          </div>

          {/* Ventilation paiements */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">
              Ventilation des paiements
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="total-cb">CB (€)</Label>
                <Input
                  id="total-cb"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.total_cb}
                  onChange={set("total_cb")}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="total-cash">Espèces (€)</Label>
                <Input
                  id="total-cash"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.total_cash}
                  onChange={set("total_cash")}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="total-check">Chèques (€)</Label>
                <Input
                  id="total-check"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.total_check}
                  onChange={set("total_check")}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="total-ticket-resto">Tickets resto (€)</Label>
                <Input
                  id="total-ticket-resto"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.total_ticket_resto}
                  onChange={set("total_ticket_resto")}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="total-other">Autre (€)</Label>
                <Input
                  id="total-other"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.total_other}
                  onChange={set("total_other")}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            {/* Payment total display */}
            <div className="rounded-md bg-muted px-3 py-2 text-sm flex justify-between">
              <span className="text-muted-foreground">Total ventilé</span>
              <span className={paymentMismatch ? "font-semibold text-red-600" : "font-semibold"}>
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                }).format(paymentSum)}
              </span>
            </div>

            {paymentMismatch && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  La somme des paiements ({new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  }).format(paymentSum)}) ne correspond pas au CA TTC (
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  }).format(totalTtc)}
                  ).
                </span>
              </div>
            )}
          </fieldset>

          {/* Couverts / tickets */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cover-count">Couverts</Label>
              <Input
                id="cover-count"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={form.cover_count}
                onChange={set("cover_count")}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticket-count">Tickets</Label>
              <Input
                id="ticket-count"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={form.ticket_count}
                onChange={set("ticket_count")}
                className="min-h-[44px]"
              />
            </div>
          </div>

          {/* TVA */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">TVA collectée</legend>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vat-5-5">TVA 5,5 % (€)</Label>
                <Input
                  id="vat-5-5"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.vat_5_5}
                  onChange={set("vat_5_5")}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vat-10">TVA 10 % (€)</Label>
                <Input
                  id="vat-10"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.vat_10}
                  onChange={set("vat_10")}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vat-20">TVA 20 % (€)</Label>
                <Input
                  id="vat-20"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.vat_20}
                  onChange={set("vat_20")}
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </fieldset>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Observations, événements particuliers…"
              value={form.notes}
              onChange={set("notes")}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="min-h-[44px]"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || paymentMismatch}
              className="min-h-[44px]"
            >
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
