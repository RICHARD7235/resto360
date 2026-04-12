"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Settings, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KitchenBoard } from "@/components/modules/commandes/kitchen-board";
import {
  getPreparationTickets,
  updatePreparationTicketStatus,
  updateOrderItemStatus,
  getRestaurantId,
} from "../actions";
import { getActiveStations } from "../../admin-operationnelle/actions";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import type { PreparationTicketWithItems } from "../actions";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

// ---------------------------------------------------------------------------
// Sound toggle
// ---------------------------------------------------------------------------

function SoundToggle() {
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("kds-sound-enabled") === "false";
  });

  function toggle() {
    const newMuted = !muted;
    setMuted(newMuted);
    localStorage.setItem("kds-sound-enabled", newMuted ? "false" : "true");
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="min-h-11 min-w-11"
      onClick={toggle}
      aria-label={muted ? "Activer le son" : "Couper le son"}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// KDS content
// ---------------------------------------------------------------------------

function CuisineContent() {
  const searchParams = useSearchParams();
  const stationParam = searchParams.get("station");

  const [tickets, setTickets] = useState<PreparationTicketWithItems[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(stationParam);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [ticketsData, stationsData, rid] = await Promise.all([
        getPreparationTickets(activeTab ?? undefined),
        getActiveStations(),
        getRestaurantId(),
      ]);
      setTickets(ticketsData);
      setStations(stationsData);
      setRestaurantId(rid);
    } catch (error) {
      console.error("Erreur chargement KDS:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Initial fetch (single load on mount)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions — replace 15s polling
  useRealtimeSubscription({
    channel: "kds-prep-tickets-rt",
    table: "preparation_tickets",
    onUpdate: fetchData,
  });

  useRealtimeSubscription({
    channel: "kds-order-items-rt",
    table: "order_items",
    onUpdate: fetchData,
  });

  async function handleItemStatusChange(itemId: string, status: string) {
    try {
      await updateOrderItemStatus(itemId, status as never);
      await fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors du changement de statut";
      toast.error(message);
    }
  }

  async function handleTicketStatusChange(ticketId: string, status: string) {
    try {
      await updatePreparationTicketStatus(ticketId, status as never);
      await fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors du changement de statut du ticket";
      toast.error(message);
    }
  }

  const currentStation = activeTab
    ? stations.find((s) => s.id === activeTab)
    : null;

  const isSupervisor = !stationParam;

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {currentStation ? currentStation.name : "Écran cuisine"}
          </h1>
          <p className="text-muted-foreground">
            {tickets.length} ticket{tickets.length > 1 ? "s" : ""} actif
            {tickets.length > 1 ? "s" : ""}
          </p>
        </div>
        <SoundToggle />
        {isSupervisor && (
          <Button
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            render={<Link href="/commandes/cuisine/setup" />}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Station tabs (supervisor mode only) */}
      {isSupervisor && stations.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={activeTab === null ? "default" : "outline"}
            className="min-h-11 shrink-0"
            onClick={() => setActiveTab(null)}
          >
            Tous
          </Button>
          {stations.map((station) => (
            <Button
              key={station.id}
              variant={activeTab === station.id ? "default" : "outline"}
              className="min-h-11 shrink-0 gap-2"
              onClick={() => setActiveTab(station.id)}
            >
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: station.color ?? "#6B7280" }}
              />
              {station.name}
            </Button>
          ))}
        </div>
      )}

      {/* Station color bar (dedicated mode) */}
      {currentStation && (
        <div
          className="h-1.5 rounded-full"
          style={{ backgroundColor: currentStation.color ?? "#6B7280" }}
        />
      )}

      {/* KDS Board */}
      <KitchenBoard
        tickets={tickets}
        onItemStatusChange={handleItemStatusChange}
        onTicketStatusChange={handleTicketStatusChange}
        showStationBadge={activeTab === null}
      />
    </div>
  );
}

export default function CuisinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <CuisineContent />
    </Suspense>
  );
}
