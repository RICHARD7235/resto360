"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { getStockItems, processInventory } from "../actions";
import type { StockItemWithStatus, StockCategory, InventoryLine } from "../actions";

const CATEGORY_LABELS: Record<string, string> = {
  viandes: "Viandes",
  poissons: "Poissons",
  "légumes": "Légumes",
  produits_laitiers: "Produits laitiers",
  boissons: "Boissons",
  "épicerie": "Épicerie",
  autre: "Autre",
};

const UNIT_LABELS: Record<string, string> = {
  kg: "kg", g: "g", L: "L", cl: "cl", piece: "pce", pack: "pack",
};

export default function InventoryCountPage() {
  const router = useRouter();

  const [items, setItems] = useState<StockItemWithStatus[]>([]);
  const [countedQuantities, setCountedQuantities] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getStockItems().then((data) => {
      setItems(data);
      // Pre-fill with current quantities
      const qty: Record<string, string> = {};
      for (const item of data) {
        qty[item.id] = "";
      }
      setCountedQuantities(qty);
      setLoading(false);
    });
  }, []);

  const filteredItems = categoryFilter
    ? items.filter((i) => i.category === categoryFilter)
    : items;

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  function getCountedValue(id: string): number | null {
    const val = countedQuantities[id];
    if (val === "" || val === undefined) return null;
    return parseFloat(val);
  }

  const touchedItems = items.filter((i) => {
    const counted = getCountedValue(i.id);
    return counted !== null;
  });

  const itemsWithDiff = touchedItems.filter((i) => {
    const counted = getCountedValue(i.id);
    return counted !== null && counted !== Number(i.current_quantity);
  });

  async function handleSubmit() {
    if (touchedItems.length === 0) {
      toast.error("Saisissez au moins une quantité comptée");
      return;
    }

    setSubmitting(true);
    try {
      const lines: InventoryLine[] = touchedItems.map((item) => ({
        stock_item_id: item.id,
        name: item.name,
        unit: item.unit,
        category: item.category || "autre",
        counted_quantity: getCountedValue(item.id) || 0,
        system_quantity: Number(item.current_quantity),
        action: "update" as const,
      }));

      const result = await processInventory(lines);
      toast.success(`Inventaire validé : ${result.updated} article${result.updated > 1 ? "s" : ""} mis à jour`);
      router.push("/stock");
    } catch {
      toast.error("Erreur lors de la validation");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/stock")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Saisie d'inventaire</h1>
          <p className="text-muted-foreground">
            Comptez les quantités physiques et validez les écarts
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={submitting || touchedItems.length === 0}>
          <Check className="mr-2 h-4 w-4" />
          {submitting ? "Validation..." : `Valider (${itemsWithDiff.length} écart${itemsWithDiff.length > 1 ? "s" : ""})`}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Toutes catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c!} value={c!}>
                {CATEGORY_LABELS[c!] || c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{filteredItems.length} articles</Badge>
          <Badge variant="secondary">{touchedItems.length} saisis</Badge>
          {itemsWithDiff.length > 0 && (
            <Badge variant="destructive">{itemsWithDiff.length} écart{itemsWithDiff.length > 1 ? "s" : ""}</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="text-right">Qté système</TableHead>
                <TableHead className="text-right">Qté comptée</TableHead>
                <TableHead className="text-right">Écart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const systemQty = Number(item.current_quantity);
                const counted = getCountedValue(item.id);
                const diff = counted !== null ? counted - systemQty : null;
                const pctDiff = diff !== null && systemQty > 0
                  ? Math.abs(diff / systemQty) * 100
                  : 0;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {CATEGORY_LABELS[item.category || ""] || item.category || "—"}
                    </TableCell>
                    <TableCell>{UNIT_LABELS[item.unit] || item.unit}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {systemQty.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="—"
                        value={countedQuantities[item.id] || ""}
                        onChange={(e) =>
                          setCountedQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-28 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {diff !== null ? (
                        <span className={pctDiff > 10 ? "text-destructive font-medium" : diff !== 0 ? "text-orange-600" : ""}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
