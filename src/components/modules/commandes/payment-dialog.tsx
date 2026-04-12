"use client";

import { useState, useMemo } from "react";
import { CreditCard, Banknote, Ticket, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createPayment } from "@/app/(dashboard)/commandes/actions";
import type { PaymentMethod } from "@/app/(dashboard)/commandes/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  payment_id: string | null;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    total: number;
    paid_amount: number;
    items: PaymentItem[];
  };
  onPaymentComplete: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Payment method options
// ---------------------------------------------------------------------------

const METHODS: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: "card", label: "Carte", icon: CreditCard },
  { value: "cash", label: "Especes", icon: Banknote },
  { value: "ticket_restaurant", label: "Ticket resto", icon: Ticket },
  { value: "other", label: "Autre", icon: FileText },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentDialog({
  open,
  onOpenChange,
  order,
  onPaymentComplete,
}: PaymentDialogProps) {
  const remaining = order.total - order.paid_amount;
  const unpaidItems = order.items.filter((i) => !i.payment_id);

  // --- Tab: by items ---
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [itemMethod, setItemMethod] = useState<PaymentMethod>("card");
  const [cashGiven, setCashGiven] = useState("");

  // --- Tab: equal split ---
  const [guests, setGuests] = useState(2);
  const [paidParts, setPaidParts] = useState(0);
  const [splitMethod, setSplitMethod] = useState<PaymentMethod>("card");

  // --- Tab: full payment ---
  const [fullMethod, setFullMethod] = useState<PaymentMethod>("card");

  // --- Common ---
  const [submitting, setSubmitting] = useState(false);

  // Computed
  const selectedTotal = useMemo(() => {
    let sum = 0;
    for (const item of unpaidItems) {
      if (selectedItemIds.has(item.id)) {
        sum += item.quantity * item.unit_price;
      }
    }
    return sum;
  }, [unpaidItems, selectedItemIds]);

  const partAmount = remaining > 0 && guests > 0 ? remaining / guests : 0;
  const remainingParts = guests - paidParts;

  const cashChange = useMemo(() => {
    const given = parseFloat(cashGiven);
    if (isNaN(given) || given <= 0) return 0;
    return Math.max(0, given - selectedTotal);
  }, [cashGiven, selectedTotal]);

  function toggleItem(itemId: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  async function handlePayByItems() {
    if (selectedItemIds.size === 0 || selectedTotal <= 0) return;
    setSubmitting(true);
    try {
      await createPayment(order.id, {
        amount: selectedTotal,
        method: itemMethod,
        label: `Paiement ${selectedItemIds.size} article(s)`,
        itemIds: [...selectedItemIds],
      });
      toast.success(`Paiement de ${selectedTotal.toFixed(2)} EUR enregistre.`);
      setSelectedItemIds(new Set());
      setCashGiven("");
      await onPaymentComplete();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur paiement";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayOnePart() {
    if (partAmount <= 0 || paidParts >= guests) return;
    setSubmitting(true);
    try {
      await createPayment(order.id, {
        amount: Math.round(partAmount * 100) / 100,
        method: splitMethod,
        label: `Part ${paidParts + 1}/${guests}`,
      });
      toast.success(`Part ${paidParts + 1}/${guests} encaissee.`);
      setPaidParts((p) => p + 1);
      await onPaymentComplete();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur paiement";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayFull() {
    if (remaining <= 0) return;
    setSubmitting(true);
    try {
      await createPayment(order.id, {
        amount: remaining,
        method: fullMethod,
        label: "Paiement total",
      });
      toast.success("Commande entierement payee.");
      await onPaymentComplete();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur paiement";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayRemaining() {
    if (remaining <= 0) return;
    setSubmitting(true);
    try {
      await createPayment(order.id, {
        amount: remaining,
        method: itemMethod,
        label: "Solde restant",
      });
      toast.success("Commande entierement payee.");
      await onPaymentComplete();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur paiement";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset state
      setSelectedItemIds(new Set());
      setCashGiven("");
      setFullMethod("card");
      setGuests(2);
      setPaidParts(0);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Encaissement</DialogTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground pt-1">
            <span>Total : {order.total.toFixed(2)} EUR</span>
            <span>Paye : {order.paid_amount.toFixed(2)} EUR</span>
            <Badge variant={remaining <= 0 ? "default" : "destructive"}>
              Reste : {remaining.toFixed(2)} EUR
            </Badge>
          </div>
        </DialogHeader>

        {remaining <= 0 ? (
          <div className="py-8 text-center">
            <p className="text-lg font-semibold text-green-600">
              Commande entierement payee
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick full payment */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Paiement total</span>
                <span className="text-lg font-bold">{remaining.toFixed(2)} EUR</span>
              </div>
              <MethodSelector value={fullMethod} onChange={setFullMethod} />
              <Button
                className="min-h-11 w-full"
                disabled={submitting || remaining <= 0}
                onClick={handlePayFull}
              >
                {submitting ? "Encaissement..." : `Tout payer (${remaining.toFixed(2)} EUR)`}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou paiement partiel</span>
              </div>
            </div>

          <Tabs defaultValue="items">
            <TabsList className="w-full">
              <TabsTrigger value="items">Par articles</TabsTrigger>
              <TabsTrigger value="split">Split egal</TabsTrigger>
              <TabsTrigger value="mixed">Mixte</TabsTrigger>
            </TabsList>

            {/* Tab: By items */}
            <TabsContent value="items">
              <div className="space-y-4 pt-2">
                {unpaidItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Tous les articles sont deja payes.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-[240px] overflow-y-auto">
                    {unpaidItems.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 min-h-[44px]"
                      >
                        <Checkbox
                          checked={selectedItemIds.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                        <span className="flex-1 text-sm">
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="text-sm font-medium">
                          {(item.quantity * item.unit_price).toFixed(2)} EUR
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {selectedTotal > 0 && (
                  <>
                    <div className="flex items-center justify-between text-sm font-medium border-t pt-3">
                      <span>Sous-total selection</span>
                      <span>{selectedTotal.toFixed(2)} EUR</span>
                    </div>

                    <MethodSelector value={itemMethod} onChange={setItemMethod} />

                    {itemMethod === "cash" && (
                      <div className="space-y-1.5">
                        <Label>Especes remises</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={cashGiven}
                          onChange={(e) => setCashGiven(e.target.value)}
                          className="min-h-11"
                        />
                        {cashChange > 0 && (
                          <p className="text-sm font-semibold text-green-600">
                            Rendu : {cashChange.toFixed(2)} EUR
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      className="min-h-11 w-full"
                      disabled={submitting || selectedTotal <= 0}
                      onClick={handlePayByItems}
                    >
                      {submitting
                        ? "Encaissement..."
                        : `Encaisser ${selectedTotal.toFixed(2)} EUR`}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Tab: Equal split */}
            <TabsContent value="split">
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Nombre de convives</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="min-h-11 min-w-11"
                      disabled={guests <= 2}
                      onClick={() => setGuests((g) => Math.max(2, g - 1))}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center text-lg font-bold">
                      {guests}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="min-h-11 min-w-11"
                      disabled={guests >= 12}
                      onClick={() => setGuests((g) => Math.min(12, g + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Montant par part</span>
                    <span className="font-bold">
                      {partAmount.toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Parts payees</span>
                    <span>
                      {paidParts} / {guests}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Parts restantes</span>
                    <span className="font-semibold text-destructive">
                      {remainingParts}
                    </span>
                  </div>
                </div>

                <MethodSelector value={splitMethod} onChange={setSplitMethod} />

                <Button
                  className="min-h-11 w-full"
                  disabled={submitting || remainingParts <= 0}
                  onClick={handlePayOnePart}
                >
                  {submitting
                    ? "Encaissement..."
                    : `Payer 1 part (${partAmount.toFixed(2)} EUR)`}
                </Button>
              </div>
            </TabsContent>

            {/* Tab: Mixed */}
            <TabsContent value="mixed">
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Selectionnez les articles individuels, puis utilisez le
                  bouton pour solder le reste.
                </p>

                {unpaidItems.length > 0 && (
                  <div className="space-y-1 max-h-[180px] overflow-y-auto">
                    {unpaidItems.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 min-h-[44px]"
                      >
                        <Checkbox
                          checked={selectedItemIds.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                        <span className="flex-1 text-sm">
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="text-sm font-medium">
                          {(item.quantity * item.unit_price).toFixed(2)} EUR
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <MethodSelector value={itemMethod} onChange={setItemMethod} />

                <div className="flex gap-2">
                  {selectedTotal > 0 && (
                    <Button
                      className="min-h-11 flex-1"
                      disabled={submitting}
                      onClick={handlePayByItems}
                    >
                      {submitting
                        ? "..."
                        : `Encaisser selection (${selectedTotal.toFixed(2)} EUR)`}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    className="min-h-11 flex-1"
                    disabled={submitting || remaining <= 0}
                    onClick={handlePayRemaining}
                  >
                    {submitting
                      ? "..."
                      : `Solder le reste (${remaining.toFixed(2)} EUR)`}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Method selector
// ---------------------------------------------------------------------------

function MethodSelector({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Mode de paiement</Label>
      <div className="flex gap-2">
        {METHODS.map((m) => {
          const Icon = m.icon;
          return (
            <Button
              key={m.value}
              variant={value === m.value ? "default" : "outline"}
              className="min-h-11 flex-1 gap-1.5 text-xs"
              onClick={() => onChange(m.value)}
            >
              <Icon className="h-4 w-4" />
              {m.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
