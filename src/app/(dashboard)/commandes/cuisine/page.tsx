"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KitchenBoard } from "@/components/modules/commandes/kitchen-board";
import {
  getActiveOrders,
  updateOrderStatus,
  updateOrderItemStatus,
} from "../actions";
import type { OrderWithItems } from "../actions";

export default function CuisinePage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getActiveOrders();
      setOrders(data);
    } catch (error) {
      console.error("Erreur chargement commandes cuisine:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // Refresh toutes les 15s pour le KDS
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function handleItemStatusChange(itemId: string, status: string) {
    await updateOrderItemStatus(itemId, status as never);
    await fetchOrders();
  }

  async function handleOrderStatusChange(orderId: string, status: string) {
    await updateOrderStatus(orderId, status as never);
    await fetchOrders();
  }

  const boardOrders = orders.map((o) => ({
    id: o.id,
    table_number: o.table_number,
    status: o.status ?? "pending",
    created_at: o.created_at ?? new Date().toISOString(),
    notes: o.notes,
    items: o.order_items.map((item) => ({
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,
      notes: item.notes,
      status: item.status ?? "pending",
    })),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          render={<Link href="/commandes" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Écran cuisine</h1>
          <p className="text-muted-foreground">
            {orders.length} commande{orders.length > 1 ? "s" : ""} active
            {orders.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* KDS Board */}
      <KitchenBoard
        orders={boardOrders}
        onItemStatusChange={handleItemStatusChange}
        onOrderStatusChange={handleOrderStatusChange}
      />
    </div>
  );
}
