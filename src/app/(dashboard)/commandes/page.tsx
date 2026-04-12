"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, ChefHat, Monitor, Settings2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCommandesStore } from "@/stores/commandes.store";
import { FloorPlanCanvas, type CanvasTable } from "@/components/modules/commandes/floor-plan-canvas";
import { TakeawayOrdersBar, type TakeawayOrder } from "@/components/modules/commandes/takeaway-orders-bar";
import { OrderSummary } from "@/components/modules/commandes/order-summary";
import {
  getActiveOrders,
  getOrderStats,
  updateOrderStatus,
  getPreparationTickets,
  getTodayReservationsForFloorPlan,
  getRestaurantTables,
  type RestaurantTable,
} from "./actions";
import { getActiveStations } from "../admin-operationnelle/actions";
import type { OrderWithItems, OrderStats, PreparationTicketWithItems, FloorPlanReservation } from "./actions";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

// ---------------------------------------------------------------------------
// Table status type alias (for canvas mapping)
// ---------------------------------------------------------------------------

type TableStatus = "free" | "occupied" | "waiting" | "ready" | "reserved";

function getTableStatus(
  orders: OrderWithItems[],
  tableNumber: string,
  tickets: PreparationTicketWithItems[],
  reservations: FloorPlanReservation[],
) {
  const order = orders.find(
    (o) => o.table_number === tableNumber && !["paid", "cancelled"].includes(o.status ?? "")
  );

  // If table has an active order, show order status (takes priority)
  if (order) {
    const statusMap: Record<string, "occupied" | "waiting" | "ready"> = {
      draft: "occupied",
      sent: "occupied",
      preparing: "waiting",
      ready: "ready",
      served: "occupied",
    };

    const orderTickets = tickets.filter((t) => t.order_id === order.id);
    const stationBadges = orderTickets
      .filter((t) => t.status !== "served")
      .map((t) => ({
        station_name: t.station_name,
        station_color: t.station_color,
        status: t.status,
      }));

    return {
      status: statusMap[order.status ?? ""] ?? ("occupied" as const),
      orderTotal: order.total ?? undefined,
      orderCreatedAt: order.created_at ?? undefined,
      guestCount: order.order_items.length,
      stationBadges,
    };
  }

  // If table has a reservation (confirmed/seated/pending), show reserved
  const reservation = reservations.find((r) => r.table_number === tableNumber);
  if (reservation) {
    return {
      status: "reserved" as const,
      reservationInfo: {
        customer_name: reservation.customer_name,
        party_size: reservation.party_size,
        time: reservation.time,
      },
    };
  }

  return { status: "free" as const };
}

// ---------------------------------------------------------------------------
// Stats cards
// ---------------------------------------------------------------------------

function CommandesStats({ stats }: { stats: OrderStats }) {
  const cards = [
    { label: "Commandes du jour", value: stats.totalOrders },
    { label: "CA du jour", value: `${stats.revenue.toFixed(2)} €` },
    { label: "En cours", value: stats.activeOrders },
    { label: "Terminées", value: stats.completedOrders },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border bg-card p-3 shadow-sm"
        >
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="text-xl font-bold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification hook
// ---------------------------------------------------------------------------

function useTicketReadyNotifications(tickets: PreparationTicketWithItems[]) {
  const previousReadyRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || Notification.permission === "denied") return;

    const currentReady = new Set(
      tickets.filter((t) => t.status === "ready").map((t) => t.id)
    );

    const newlyReady = [...currentReady].filter(
      (id) => !previousReadyRef.current.has(id)
    );

    previousReadyRef.current = currentReady;

    if (newlyReady.length === 0) return;

    for (const ticketId of newlyReady) {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) continue;

      const title = ticket.table_number
        ? `Table ${ticket.table_number}`
        : "A emporter";

      if (Notification.permission === "granted") {
        new Notification(`${title} — ${ticket.station_name} pret`, {
          body: `${ticket.items.length} article(s) a recuperer`,
          tag: ticketId,
        });
      }
    }
  }, [tickets]);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CommandesPage() {
  const { selectedTable, setSelectedTable } = useCommandesStore();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    revenue: 0,
    activeOrders: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [prepTickets, setPrepTickets] = useState<PreparationTicketWithItems[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [reservations, setReservations] = useState<FloorPlanReservation[]>([]);
  const [restaurantTables, setRestaurantTables] = useState<RestaurantTable[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [ordersData, statsData, ticketsData, stationsData, reservationsData, tablesData] = await Promise.all([
        getActiveOrders(),
        getOrderStats(today),
        getPreparationTickets(),
        getActiveStations(),
        getTodayReservationsForFloorPlan(),
        getRestaurantTables(),
      ]);
      setOrders(ordersData);
      setStats(statsData);
      setPrepTickets(ticketsData);
      setStations(stationsData);
      setReservations(reservationsData);
      setRestaurantTables(tablesData);
    } catch (error) {
      console.error("Erreur chargement commandes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh toutes les 15s pour le temps réel basique
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useTicketReadyNotifications(prepTickets);

  // Map DB tables to CanvasTable[] with live status
  const canvasTables: CanvasTable[] = restaurantTables.map((rt) => {
    const statusInfo = getTableStatus(orders, rt.name, prepTickets, reservations);
    return {
      id: rt.id,
      name: rt.name,
      zone: rt.zone,
      capacity: rt.capacity,
      shape: rt.shape,
      width: rt.width,
      height: rt.height,
      pos_x: rt.pos_x,
      pos_y: rt.pos_y,
      status: statusInfo.status as TableStatus,
      orderTotal: "orderTotal" in statusInfo ? statusInfo.orderTotal : undefined,
      stationBadges: "stationBadges" in statusInfo ? statusInfo.stationBadges : undefined,
    };
  });

  // Takeaway orders = orders without a table_number
  const takeawayOrders: TakeawayOrder[] = orders
    .filter((o) => !o.table_number)
    .map((o) => ({
      id: o.id,
      customer_name: o.notes ?? null,
      order_type: "takeaway",
      status: o.status ?? "sent",
      total: o.total ?? 0,
    }));

  const selectedOrder = selectedTable
    ? orders.find(
        (o) =>
          o.table_number === selectedTable &&
          !["paid", "cancelled"].includes(o.status ?? "")
      )
    : null;

  async function handleStatusChange(orderId: string, status: string) {
    try {
      await updateOrderStatus(orderId, status as never);
      await fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors du changement de statut";
      toast.error(message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Commandes & Service
          </h1>
          <p className="text-muted-foreground">
            Plan de salle et gestion des commandes en temps réel
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-11 gap-2"
            render={<Link href="/commandes/plan-de-salle" />}
          >
            <Settings2 className="h-4 w-4" />
            Editeur plan
          </Button>
          {stations.map((station) => (
            <Button
              key={station.id}
              variant="outline"
              className="min-h-11 gap-2"
              render={<Link href={`/commandes/cuisine?station=${station.id}`} />}
            >
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: station.color ?? "#6B7280" }}
              />
              Écran {station.name}
            </Button>
          ))}
          {stations.length > 1 && (
            <Button
              variant="outline"
              className="min-h-11 gap-2"
              render={<Link href="/commandes/cuisine" />}
            >
              <Monitor className="h-4 w-4" />
              Tous les postes
            </Button>
          )}
          {selectedTable && (
            <Button
              className="min-h-11 gap-2"
              render={
                <Link href={`/commandes/nouvelle?table=${selectedTable}`} />
              }
            >
              <Plus className="h-4 w-4" />
              Nouvelle commande
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <CommandesStats stats={stats} />

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Plan de salle */}
        <div className="lg:col-span-2 space-y-4">
          <FloorPlanCanvas
            tables={canvasTables}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
          />
          <TakeawayOrdersBar
            orders={takeawayOrders}
            onSelectOrder={(orderId) => {
              const order = orders.find((o) => o.id === orderId);
              if (order?.table_number) setSelectedTable(order.table_number);
            }}
          />
        </div>

        {/* Détail commande sélectionnée */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            {selectedTable
              ? `Table ${selectedTable}`
              : "Sélectionnez une table"}
          </h2>
          {selectedOrder ? (
            <div className="space-y-3">
              <OrderSummary
                order={{
                  id: selectedOrder.id,
                  table_number: selectedOrder.table_number,
                  status: selectedOrder.status ?? "sent",
                  total: selectedOrder.total ?? 0,
                  notes: selectedOrder.notes,
                  created_at: selectedOrder.created_at ?? new Date().toISOString(),
                  items: selectedOrder.order_items.map((item) => ({
                    id: item.id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    status: item.status ?? "pending",
                  })),
                }}
                onViewDetail={() => {}}
                onStatusChange={handleStatusChange}
              />
              <Button
                variant="outline"
                className="min-h-11 w-full gap-2"
                render={
                  <Link href={`/commandes/nouvelle?table=${selectedTable}&order=${selectedOrder.id}`} />
                }
              >
                <Plus className="h-4 w-4" />
                Ajouter des articles
              </Button>
            </div>
          ) : selectedTable ? (
            <div className="rounded-xl border bg-card p-6 text-center space-y-4">
              {/* Show reservation info if table is reserved */}
              {(() => {
                const tableReservation = reservations.find((r) => r.table_number === selectedTable);
                if (tableReservation) {
                  return (
                    <div className="rounded-lg bg-purple-50 border border-purple-200 p-4 text-left space-y-1">
                      <p className="text-sm font-semibold text-purple-800">
                        Réservation
                      </p>
                      <p className="text-sm text-purple-700">
                        {tableReservation.customer_name} — {tableReservation.party_size} couverts
                      </p>
                      <p className="text-xs text-purple-600">
                        {tableReservation.time.slice(0, 5)}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
              <p className="text-sm text-muted-foreground">
                Aucune commande active pour cette table
              </p>
              <Button
                className="min-h-11 gap-2"
                render={
                  <Link href={`/commandes/nouvelle?table=${selectedTable}`} />
                }
              >
                <Plus className="h-4 w-4" />
                Nouvelle commande
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Cliquez sur une table pour voir sa commande
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
