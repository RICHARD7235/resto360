"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
    title: "A faire",
    headerBg: "bg-gray-500",
    headerText: "text-white",
    badgeBg: "bg-gray-600",
  },
  {
    key: "in_progress" as const,
    title: "En cours",
    headerBg: "bg-amber-500",
    headerText: "text-white",
    badgeBg: "bg-amber-600",
  },
  {
    key: "ready" as const,
    title: "Pret",
    headerBg: "bg-green-500",
    headerText: "text-white",
    badgeBg: "bg-green-600",
  },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

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
// SortableTicket wrapper
// ---------------------------------------------------------------------------

function SortableTicket({
  ticket,
  onItemStatusChange,
  onTicketStatusChange,
  showStationBadge,
  isPulsing,
}: {
  ticket: TicketData;
  onItemStatusChange: (itemId: string, status: string) => void;
  onTicketStatusChange: (ticketId: string, status: string) => void;
  showStationBadge: boolean;
  isPulsing: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl transition-shadow",
        isPulsing &&
          "animate-pulse ring-2 ring-red-400 shadow-lg shadow-red-400/25"
      )}
    >
      <KitchenTicket
        ticket={ticket}
        onItemStatusChange={onItemStatusChange}
        onTicketStatusChange={onTicketStatusChange}
        showStationBadge={showStationBadge}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
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

  // Local ordering state per column (ids)
  const [columnOrder, setColumnOrder] = useState<Record<ColumnKey, string[]>>({
    pending: [],
    in_progress: [],
    ready: [],
  });

  // Sync external ticket list into column order
  useEffect(() => {
    const grouped: Record<ColumnKey, string[]> = {
      pending: [],
      in_progress: [],
      ready: [],
    };

    for (const t of tickets) {
      const col = t.status as ColumnKey;
      if (col in grouped) {
        grouped[col].push(t.id);
      }
    }

    setColumnOrder((prev) => {
      const next: Record<ColumnKey, string[]> = { pending: [], in_progress: [], ready: [] };
      for (const key of Object.keys(next) as ColumnKey[]) {
        // Keep existing order for ids that still exist
        const existing = prev[key].filter((id) => grouped[key].includes(id));
        const newIds = grouped[key].filter((id) => !existing.includes(id));
        next[key] = [...existing, ...newIds];
      }
      return next;
    });
  }, [tickets]);

  const ticketMap = new Map(tickets.map((t) => [t.id, t]));
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Find which column an id is in
  const findColumn = useCallback(
    (id: string): ColumnKey | null => {
      for (const key of Object.keys(columnOrder) as ColumnKey[]) {
        if (columnOrder[key].includes(id)) return key;
      }
      // Also check container ids (column keys used as droppable ids)
      if ((Object.keys(columnOrder) as ColumnKey[]).includes(id as ColumnKey)) {
        return id as ColumnKey;
      }
      return null;
    },
    [columnOrder]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeCol = findColumn(active.id as string);
      let overCol = findColumn(over.id as string);

      // If over is a column key itself
      if ((Object.keys(columnOrder) as ColumnKey[]).includes(over.id as ColumnKey)) {
        overCol = over.id as ColumnKey;
      }

      if (!activeCol || !overCol || activeCol === overCol) return;

      // Move ticket from one column to another
      setColumnOrder((prev) => {
        const fromList = prev[activeCol].filter((id) => id !== active.id);
        const toList = [...prev[overCol]];

        // Find insertion index
        const overIndex = toList.indexOf(over.id as string);
        const insertAt = overIndex >= 0 ? overIndex : toList.length;
        toList.splice(insertAt, 0, active.id as string);

        return { ...prev, [activeCol]: fromList, [overCol]: toList };
      });
    },
    [findColumn, columnOrder]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeCol = findColumn(active.id as string);
      let overCol = findColumn(over.id as string);

      if ((Object.keys(columnOrder) as ColumnKey[]).includes(over.id as ColumnKey)) {
        overCol = over.id as ColumnKey;
      }

      if (!activeCol || !overCol) return;

      // Same column reorder
      if (activeCol === overCol) {
        const items = columnOrder[activeCol];
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        if (oldIndex !== newIndex && newIndex >= 0) {
          setColumnOrder((prev) => ({
            ...prev,
            [activeCol]: arrayMove(prev[activeCol], oldIndex, newIndex),
          }));
        }
        return;
      }

      // Cross-column: trigger status change
      const ticket = ticketMap.get(active.id as string);
      if (ticket) {
        onTicketStatusChange(ticket.id, overCol);
      }
    },
    [findColumn, columnOrder, ticketMap, onTicketStatusChange]
  );

  const activeTicket = activeId ? ticketMap.get(activeId) ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full w-full gap-4 overflow-x-auto p-4">
        {COLUMNS.map((col) => {
          const ids = columnOrder[col.key];
          const columnTickets = ids
            .map((id) => ticketMap.get(id))
            .filter((t): t is TicketData => t != null);

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

              <SortableContext
                id={col.key}
                items={ids}
                strategy={verticalListSortingStrategy}
              >
                <ScrollArea className="flex-1">
                  <div className="space-y-3 p-3 min-h-[80px]">
                    {columnTickets.length === 0 ? (
                      <p className="py-12 text-center text-sm text-muted-foreground">
                        Aucune commande
                      </p>
                    ) : (
                      columnTickets.map((ticket) => (
                        <SortableTicket
                          key={ticket.id}
                          ticket={ticket}
                          onItemStatusChange={onItemStatusChange}
                          onTicketStatusChange={onTicketStatusChange}
                          showStationBadge={showStationBadge}
                          isPulsing={pulsingIds.has(ticket.id)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </SortableContext>
            </div>
          );
        })}
      </div>

      {/* Drag overlay for the ticket being dragged */}
      <DragOverlay>
        {activeTicket ? (
          <div className="w-[340px] opacity-90 shadow-2xl rounded-xl">
            <KitchenTicket
              ticket={activeTicket}
              onItemStatusChange={onItemStatusChange}
              onTicketStatusChange={onTicketStatusChange}
              showStationBadge={showStationBadge}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
