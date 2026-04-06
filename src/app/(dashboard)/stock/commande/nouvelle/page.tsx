"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createPurchaseOrder,
  sendPurchaseOrder,
  getStockItems,
  getSuggestedPurchaseItems,
} from "../../actions";
import type { SuggestedItem, StockItemWithStatus } from "../../actions";
import { getSuppliers } from "@/app/(dashboard)/fournisseurs/actions";
import type { Tables } from "@/types/database.types";

type SupplierRow = Tables<"suppliers">;

interface OrderLine {
  stock_item_id: string;
  stock_item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  catalog_item_id?: string;
}

const UNIT_LABELS: Record<string, string> = {
  kg: "kg", g: "g", L: "L", cl: "cl", piece: "pce", pack: "pack",
};

function PurchaseOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSupplierId = searchParams.get("supplier");

  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [stockItems, setStockItems] = useState<StockItemWithStatus[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(preselectedSupplierId || "");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addItemId, setAddItemId] = useState("");

  useEffect(() => {
    Promise.all([getSuppliers(), getStockItems()]).then(([s, si]) => {
      setSuppliers(s.filter((sup) => sup.is_active));
      setStockItems(si);
    });
  }, []);

  const loadSuggestions = useCallback(async (supplierId: string) => {
    if (!supplierId) return;
    try {
      const suggestions = await getSuggestedPurchaseItems(supplierId);
      setLines(
        suggestions.map((s) => ({
          stock_item_id: s.stock_item_id,
          stock_item_name: s.stock_item_name,
          unit: s.unit,
          quantity: s.suggested_quantity,
          unit_price: s.unit_price,
          catalog_item_id: s.catalog_item_id || undefined,
        }))
      );
    } catch {
      // No suggestions, start empty
    }
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      loadSuggestions(selectedSupplierId);
    }
  }, [selectedSupplierId, loadSuggestions]);

  function handleAddItem() {
    if (!addItemId) return;
    if (lines.some((l) => l.stock_item_id === addItemId)) {
      toast.error("Article déjà ajouté");
      return;
    }
    const item = stockItems.find((i) => i.id === addItemId);
    if (!item) return;
    setLines((prev) => [
      ...prev,
      {
        stock_item_id: item.id,
        stock_item_name: item.name,
        unit: item.unit,
        quantity: 1,
        unit_price: Number(item.unit_cost) || 0,
      },
    ]);
    setAddItemId("");
  }

  function updateLine(index: number, updates: Partial<OrderLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const totalHt = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

  async function handleSubmit(sendImmediately: boolean) {
    if (!selectedSupplierId || lines.length === 0) {
      toast.error("Sélectionnez un fournisseur et ajoutez des articles");
      return;
    }
    setSubmitting(true);
    try {
      const order = await createPurchaseOrder(
        selectedSupplierId,
        lines.map((l) => ({
          stock_item_id: l.stock_item_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
          catalog_item_id: l.catalog_item_id,
        })),
        notes || undefined,
        expectedDate || undefined
      );

      if (sendImmediately) {
        await sendPurchaseOrder(order.id);
        toast.success("Bon de commande envoyé");
      } else {
        toast.success("Brouillon enregistré");
      }

      router.push("/stock?tab=achats");
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  }

  // Stock items not already in lines
  const availableItems = stockItems.filter(
    (si) => !lines.some((l) => l.stock_item_id === si.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau bon de commande</h1>
          <p className="text-muted-foreground">Créer un bon de commande fournisseur</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Articles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Fournisseur *</Label>
                <Select value={selectedSupplierId} onValueChange={(v) => setSelectedSupplierId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Livraison prévue</Label>
                <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
              </div>
            </div>

            {lines.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {lines.length} article{lines.length > 1 ? "s" : ""} — suggestions automatiques basées sur le stock bas
              </Badge>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Prix unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <TableRow key={line.stock_item_id}>
                    <TableCell className="font-medium">{line.stock_item_name}</TableCell>
                    <TableCell>{UNIT_LABELS[line.unit] || line.unit}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.quantity}
                        onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.unit_price}
                        onChange={(e) => updateLine(i, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(line.quantity * line.unit_price).toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeLine(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {selectedSupplierId
                        ? "Aucun article en stock bas — ajoutez manuellement"
                        : "Sélectionnez un fournisseur pour voir les suggestions"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label>Ajouter un article</Label>
                <Select value={addItemId} onValueChange={(v) => setAddItemId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Rechercher un article..." /></SelectTrigger>
                  <SelectContent>
                    {availableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name} ({UNIT_LABELS[item.unit] || item.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={handleAddItem} disabled={!addItemId}>
                <Plus className="mr-2 h-4 w-4" />Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Articles</span>
                <span className="font-medium">{lines.length}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-4">
                <span>Total HT</span>
                <span>{totalHt.toFixed(2)} €</span>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Conditions, instructions..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting || lines.length === 0}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {submitting ? "Envoi..." : "Envoyer la commande"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || lines.length === 0}
                >
                  Enregistrer brouillon
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewPurchaseOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <PurchaseOrderForm />
    </Suspense>
  );
}
