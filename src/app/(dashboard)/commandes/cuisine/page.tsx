"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KitchenBoard } from "@/components/modules/commandes/kitchen-board";
import {
  getPreparationTickets,
  updatePreparationTicketStatus,
  updateOrderItemStatus,
} from "../actions";
import { getActiveStations } from "../../admin-operationnelle/actions";
import type { PreparationTicketWithItems } from "../actions";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

function CuisineContent() {
  const searchParams = useSearchParams();
  const stationParam = searchParams.get("station");

  const [tickets, setTickets] = useState<PreparationTicketWithItems[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(stationParam);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [ticketsData, stationsData] = await Promise.all([
        getPreparationTickets(activeTab ?? undefined),
        getActiveStations(),
      ]);
      setTickets(ticketsData);
      setStations(stationsData);
    } catch (error) {
      console.error("Erreur chargement KDS:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleItemStatusChange(itemId: string, status: string) {
    await updateOrderItemStatus(itemId, status as never);
    await fetchData();
  }

  async function handleTicketStatusChange(ticketId: string, status: string) {
    await updatePreparationTicketStatus(ticketId, status as never);
    await fetchData();
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
