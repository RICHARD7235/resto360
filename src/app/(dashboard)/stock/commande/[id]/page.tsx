"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Ban, Check, Send, Truck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getPurchaseOrder,
  sendPurchaseOrder,
  cancelPurchaseOrder,
  receivePurchaseOrder,
} from "../../actions";
import type { PurchaseOrderDetail } from "../../actions";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  sent: { label: "Envoyé", variant: "default" },
  partially_received: { label: "Partiellement reçu", variant: "secondary" },
  received: { label: "Reçu", variant: "default" },
  cancelled: { label: "Annulé", variant: "destructive" },
};

const UNIT_LABELS: Record<string, string> = {
  kg: "kg", g: "g", L: "L", cl: "cl", piece: "pce", pack: "pack",
};

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [receivedQty, setReceivedQty] = useState<Record<string, number>>({});
  const [receiving, setReceiving] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function loadOrder() {
    try {
      const data = await getPurchaseOrder(id);
      setOrder(data);
      // Pre-fill received quantities with existing values
      const qty: Record<string, number> = {};
      for (const item of data.items) {
        qty[item.id] = Number(item.quantity_received) || 0;
      }
      setReceivedQty(qty);
    } catch {
      toast.error("Bon de commande introuvable");
      router.push("/stock");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function handleSend() {
    setProcessing(true);
    try {
      await sendPurchaseOrder(id);
      toast.success("Bon de commande envoyé");
      loadOrder();
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    setProcessing(true);
    try {
      await cancelPurchaseOrder(id);
      toast.success("Bon de commande annulé");
      loadOrder();
    } catch {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReceive() {
    if (!order) return;
    setProcessing(true);
    try {
      const receivedItems = order.items.map((item) => ({
        item_id: item.id,
        quantity_received: receivedQty[item.id] || 0,
      }));
      await receivePurchaseOrder(id, receivedItems);
      toast.success("Réception enregistrée — stock mis à jour");
      setReceiving(false);
      loadOrder();
    } catch {
      toast.error("Erreur lors de la réception");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!order) return null;

  const status = STATUS_CONFIG[order.status] || { label: order.status, variant: "outline" as const };
  const canSend = order.status === "draft";
  const canCancel = order.status === "draft" || order.status === "sent";
  const canReceive = order.status === "sent" || order.status === "partially_received";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/stock")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Bon de commande</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground">
            {order.supplier_name} — {format(new Date(order.order_date), "dd MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <div className="flex gap-2">
          {canSend && (
            <Button onClick={handleSend} disabled={processing}>
              <Send className="mr-2 h-4 w-4" />Envoyer
            </Button>
          )}
          {canReceive && !receiving && (
            <Button onClick={() => setReceiving(true)}>
              <Truck className="mr-2 h-4 w-4" />Réceptionner
            </Button>
          )}
          {canCancel && (
            <Button variant="destructive" onClick={handleCancel} disabled={processing}>
              <Ban className="mr-2 h-4 w-4" />Annuler
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Lignes de commande</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-right">Commandé</TableHead>
                  <TableHead className="text-right">Reçu</TableHead>
                  <TableHead className="text-right">Prix unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => {
                  const ordered = Number(item.quantity_ordered);
                  const received = Number(item.quantity_received);
                  const isComplete = received >= ordered;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.stock_item_name}
                        {isComplete && <Check className="inline ml-2 h-4 w-4 text-green-600" />}
                      </TableCell>
                      <TableCell>{UNIT_LABELS[item.stock_item_unit] || item.stock_item_unit}</TableCell>
                      <TableCell className="text-right font-mono">{ordered}</TableCell>
                      <TableCell className="text-right">
                        {receiving ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={receivedQty[item.id] || 0}
                            onChange={(e) =>
                              setReceivedQty((prev) => ({
                                ...prev,
                                [item.id]: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-24 text-right"
                          />
                        ) : (
                          <span className={`font-mono ${received < ordered ? "text-orange-600" : "text-green-600"}`}>
                            {received}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(item.unit_price).toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(ordered * Number(item.unit_price)).toFixed(2)} €
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {receiving && (
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setReceiving(false)}>Annuler</Button>
                <Button onClick={handleReceive} disabled={processing}>
                  <Check className="mr-2 h-4 w-4" />
                  {processing ? "Traitement..." : "Valider la réception"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fournisseur</span>
              <span className="font-medium">{order.supplier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date commande</span>
              <span>{format(new Date(order.order_date), "dd/MM/yyyy")}</span>
            </div>
            {order.expected_delivery_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison prévue</span>
                <span>{format(new Date(order.expected_delivery_date), "dd/MM/yyyy")}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>Total HT</span>
              <span>{Number(order.total_ht).toFixed(2)} €</span>
            </div>
            {order.notes && (
              <div className="border-t pt-3">
                <p className="text-muted-foreground mb-1">Notes</p>
                <p>{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
