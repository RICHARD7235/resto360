"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownUp,
  Download,
  Euro,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStockStore } from "@/stores/stock.store";
import { StockItemForm } from "@/components/modules/stock/stock-item-form";
import type { StockItemFormData } from "@/components/modules/stock/stock-item-form";
import { MovementForm } from "@/components/modules/stock/movement-form";
import { InventoryImportDialog } from "@/components/modules/stock/inventory-import-dialog";
import { generateTemplate } from "@/lib/inventory-import";
import {
  getStockItems,
  getStockStats,
  getStockMovements,
  getPurchaseOrders,
  createStockItem,
  updateStockItem,
  createManualMovement,
  processInventory,
  matchStockItemsByName,
  getStockItemsForTemplate,
} from "./actions";
import type {
  StockItemWithStatus,
  StockStats,
  StockCategory,
  StockStatus,
  TrackingMode,
  MovementType,
  PurchaseOrderWithSupplier,
  InventoryLine,
} from "./actions";
import type { Tables } from "@/types/database.types";

type StockMovementRow = Tables<"stock_movements">;

const STATUS_LABELS: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ok: { label: "OK", variant: "default" },
  low: { label: "Bas", variant: "secondary" },
  critical: { label: "Critique", variant: "destructive" },
};

const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
  purchase: { label: "Achat", color: "text-green-600" },
  consumption: { label: "Consommation", color: "text-orange-600" },
  waste: { label: "Perte", color: "text-red-600" },
  adjustment: { label: "Ajustement", color: "text-blue-600" },
  return: { label: "Retour", color: "text-purple-600" },
  inventory: { label: "Inventaire", color: "text-cyan-600" },
};

const PO_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  sent: { label: "Envoyé", variant: "default" },
  partially_received: { label: "Partiel", variant: "secondary" },
  received: { label: "Reçu", variant: "default" },
  cancelled: { label: "Annulé", variant: "destructive" },
};

const UNIT_LABELS: Record<string, string> = { kg: "kg", g: "g", L: "L", cl: "cl", piece: "pce", pack: "pack" };

export default function StockPage() {
  const router = useRouter();
  const store = useStockStore();

  const [items, setItems] = useState<StockItemWithStatus[]>([]);
  const [stats, setStats] = useState<StockStats | null>(null);
  const [movements, setMovements] = useState<(StockMovementRow & { stock_item_name: string })[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Tables<"stock_items"> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [itemsData, statsData, movData, poData] = await Promise.all([
        getStockItems({
          category: (store.categoryFilter || undefined) as StockCategory | undefined,
          status: (store.statusFilter || undefined) as StockStatus | undefined,
          trackingMode: (store.trackingFilter || undefined) as TrackingMode | undefined,
          search: store.searchQuery || undefined,
        }),
        getStockStats(),
        getStockMovements({}),
        getPurchaseOrders({}),
      ]);
      setItems(itemsData);
      setStats(statsData);
      setMovements(movData);
      setPurchaseOrders(poData);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [store.categoryFilter, store.statusFilter, store.trackingFilter, store.searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreateItem(data: StockItemFormData) {
    try { await createStockItem(data); toast.success("Article créé"); loadData(); } catch { toast.error("Erreur"); }
  }
  async function handleUpdateItem(data: StockItemFormData) {
    if (!store.selectedStockItemId) return;
    try { await updateStockItem(store.selectedStockItemId, data); toast.success("Article modifié"); loadData(); } catch { toast.error("Erreur"); }
  }
  async function handleMovement(data: { stock_item_id: string; type: string; quantity: number; notes?: string }) {
    try {
      await createManualMovement(data as Parameters<typeof createManualMovement>[0]);
      toast.success("Mouvement enregistré");
      loadData();
    } catch { toast.error("Erreur"); }
  }
  async function handleDownloadTemplate() {
    try {
      const items = await getStockItemsForTemplate();
      const buffer = generateTemplate(items);
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventaire-modele-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Erreur lors du téléchargement"); }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock & Achats</h1>
          <p className="text-muted-foreground">Gestion des stocks, mouvements et bons de commande</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="flex items-center gap-3 p-4">
            <Package className="h-8 w-8 text-primary" />
            <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Articles en stock</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div><p className="text-2xl font-bold">{stats.alertsCount}</p><p className="text-sm text-muted-foreground">Alertes stock bas</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4">
            <Euro className="h-8 w-8 text-green-600" />
            <div><p className="text-2xl font-bold">{stats.totalValue.toFixed(0)} €</p><p className="text-sm text-muted-foreground">Valeur totale du stock</p></div>
          </CardContent></Card>
        </div>
      )}

      <Tabs value={store.activeTab} onValueChange={(v) => store.setActiveTab(v as "inventaire" | "mouvements" | "achats")}>
        <TabsList>
          <TabsTrigger value="inventaire">Inventaire</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
          <TabsTrigger value="achats">Achats</TabsTrigger>
        </TabsList>

        {/* Tab: Inventaire */}
        <TabsContent value="inventaire" className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={store.searchQuery} onChange={(e) => store.setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={store.statusFilter} onValueChange={(v) => store.setStatusFilter(v ?? "")}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="low">Bas</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditingItem(null); store.setSelectedStockItemId(null); store.setStockItemFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Nouvel article
            </Button>
            <Button variant="outline" onClick={() => store.setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />Importer
            </Button>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />Modèle
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="text-right">Seuil</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Suivi</TableHead>
                <TableHead className="text-right">Coût unit.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const s = STATUS_LABELS[item.stock_status];
                return (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => {
                    setEditingItem(item); store.setSelectedStockItemId(item.id); store.setStockItemFormOpen(true);
                  }}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.category || "—"}</TableCell>
                    <TableCell className="text-right font-mono">{Number(item.current_quantity).toFixed(2)}</TableCell>
                    <TableCell>{UNIT_LABELS[item.unit] || item.unit}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{Number(item.alert_threshold).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{item.tracking_mode === "ingredient" ? "Ingrédient" : "Lot"}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{Number(item.unit_cost).toFixed(2)} €</TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucun article de stock</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Tab: Mouvements */}
        <TabsContent value="mouvements" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => store.setMovementFormOpen(true)}>
              <ArrowDownUp className="mr-2 h-4 w-4" />Mouvement manuel
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => {
                const ml = MOVEMENT_LABELS[m.type] || { label: m.type, color: "" };
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</TableCell>
                    <TableCell className="font-medium">{m.stock_item_name}</TableCell>
                    <TableCell><span className={ml.color}>{ml.label}</span></TableCell>
                    <TableCell className={`text-right font-mono ${Number(m.quantity) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {Number(m.quantity) >= 0 ? "+" : ""}{Number(m.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.notes || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {movements.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun mouvement</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Tab: Achats */}
        <TabsContent value="achats" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => router.push("/stock/commande/nouvelle")}>
              <ShoppingCart className="mr-2 h-4 w-4" />Nouveau bon de commande
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Total HT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((po) => {
                const ps = PO_STATUS_LABELS[po.status] || { label: po.status, variant: "outline" as const };
                return (
                  <TableRow key={po.id} className="cursor-pointer" onClick={() => router.push(`/stock/commande/${po.id}`)}>
                    <TableCell>{format(new Date(po.order_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{po.supplier_name}</TableCell>
                    <TableCell><Badge variant={ps.variant}>{ps.label}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{Number(po.total_ht).toFixed(2)} €</TableCell>
                  </TableRow>
                );
              })}
              {purchaseOrders.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun bon de commande</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <StockItemForm open={store.stockItemFormOpen} onOpenChange={store.setStockItemFormOpen} item={editingItem}
        onSubmit={editingItem ? handleUpdateItem : handleCreateItem} />
      <MovementForm open={store.movementFormOpen} onOpenChange={store.setMovementFormOpen} stockItems={items}
        onSubmit={handleMovement} />
      <InventoryImportDialog open={store.importDialogOpen} onOpenChange={store.setImportDialogOpen}
        onMatchNames={matchStockItemsByName} onSubmit={processInventory} />
    </div>
  );
}
