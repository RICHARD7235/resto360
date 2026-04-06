"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KitchenTicket, type TicketData } from "./kitchen-ticket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KitchenBoardProps {
  tickets: TicketData[];
  onItemStatusChange: (itemId: string, status: string) => void;
  onTicketStatusChange: (ticketId: string, status: string) => void;
  showStationBadge?: boolean;
}

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

const COLUMNS = [
  {
    key: "pending" as const,
    title: "Nouvelles",
    headerBg: "bg-red-500",
    headerText: "text-white",
    badgeBg: "bg-red-600",
  },
  {
    key: "in_progress" as const,
    title: "En preparation",
    headerBg: "bg-amber-500",
    headerText: "text-white",
    badgeBg: "bg-amber-600",
  },
  {
    key: "ready" as const,
    title: "Pretes",
    headerBg: "bg-green-500",
    headerText: "text-white",
    badgeBg: "bg-green-600",
  },
] as const;

// ---------------------------------------------------------------------------
// Pulse hook
// ---------------------------------------------------------------------------

function useNewTicketIds(tickets: TicketData[]): Set<string> {
  const previousIdsRef = useRef<Set<string>>(new Set());
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(tickets.map((t) => t.id));
    const newIds = new Set<string>();

    currentIds.forEach((id) => {
      if (!previousIdsRef.current.has(id)) {
        newIds.add(id);
      }
    });

    previousIdsRef.current = currentIds;

    if (newIds.size > 0) {
      setPulsingIds(newIds);
      const timeout = setTimeout(() => setPulsingIds(new Set()), 3_000);
      return () => clearTimeout(timeout);
    }
  }, [tickets]);

  return pulsingIds;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KitchenBoard({
  tickets,
  onItemStatusChange,
  onTicketStatusChange,
  showStationBadge = false,
}: KitchenBoardProps) {
  const pulsingIds = useNewTicketIds(tickets);

  const grouped = {
    pending: tickets.filter((t) => t.status === "pending"),
    in_progress: tickets.filter((t) => t.status === "in_progress"),
    ready: tickets.filter((t) => t.status === "ready"),
  };

  return (
    <div className="flex h-full w-full gap-4 overflow-x-auto p-4">
      {COLUMNS.map((col) => {
        const columnTickets = grouped[col.key];
        return (
          <div
            key={col.key}
            className="flex min-w-[340px] flex-1 flex-col overflow-hidden rounded-xl bg-muted/30 ring-1 ring-foreground/5"
          >
            <div
              className={cn(
                "flex items-center justify-between px-4 py-3",
                col.headerBg,
                col.headerText
              )}
            >
              <h2 className="text-lg font-bold">{col.title}</h2>
              <Badge
                className={cn(
                  "min-w-[28px] justify-center text-sm font-bold",
                  col.badgeBg,
                  col.headerText,
                  "border border-white/30"
                )}
              >
                {columnTickets.length}
              </Badge>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-3 p-3">
                {columnTickets.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Aucune commande
                  </p>
                ) : (
                  columnTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={cn(
                        "rounded-xl transition-shadow",
                        pulsingIds.has(ticket.id) &&
                          "animate-pulse ring-2 ring-red-400 shadow-lg shadow-red-400/25"
                      )}
                    >
                      <KitchenTicket
                        ticket={ticket}
                        onItemStatusChange={onItemStatusChange}
                        onTicketStatusChange={onTicketStatusChange}
                        showStationBadge={showStationBadge}
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
