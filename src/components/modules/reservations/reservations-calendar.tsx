"use client";

import { useMemo } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database.types";

interface ReservationsCalendarProps {
  reservations: Tables<"reservations">[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectReservation: (id: string) => void;
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  confirmed: { label: "Confirmee", className: "bg-green-100 text-green-800 border-green-200" },
  seated: { label: "En salle", className: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Terminee", className: "bg-gray-100 text-gray-800 border-gray-200" },
  cancelled: { label: "Annulee", className: "bg-red-100 text-red-800 border-red-200" },
  no_show: { label: "No-show", className: "bg-red-100 text-red-800 border-red-200" },
};

const typeLabels: Record<string, string> = {
  restaurant: "Restaurant",
  salle: "Location salle",
  seminaire: "Seminaire",
};

export function ReservationsCalendar({
  reservations,
  selectedDate,
  onSelectDate,
  onSelectReservation,
}: ReservationsCalendarProps) {
  // Set of date strings (YYYY-MM-DD) that have reservations
  const datesWithReservations = useMemo(() => {
    const dateSet = new Set<string>();
    for (const resa of reservations) {
      dateSet.add(resa.date);
    }
    return dateSet;
  }, [reservations]);

  // Date objects for the modifier
  const hasReservationDates = useMemo(() => {
    return Array.from(datesWithReservations).map((d) => parseISO(d));
  }, [datesWithReservations]);

  // Reservations for the selected day
  const selectedDayReservations = useMemo(() => {
    return reservations
      .filter((resa) => isSameDay(parseISO(resa.date), selectedDate))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [reservations, selectedDate]);

  function handleSelect(date: Date | undefined) {
    if (date) {
      onSelectDate(date);
    }
  }

  return (
    <div className="space-y-4">
      {/* Calendar navigation */}
      <Card className="shadow-sm">
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={fr}
            modifiers={{ hasReservation: hasReservationDates }}
            modifiersStyles={{
              hasReservation: {
                position: "relative",
              },
            }}
            modifiersClassNames={{
              hasReservation:
                "after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:size-1.5 after:rounded-full after:bg-primary",
            }}
            className="mx-auto"
          />
        </CardContent>
      </Card>

      {/* Reservations list for selected day */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">
          {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
          {selectedDayReservations.length > 0 && (
            <span className="ml-2 text-foreground">
              ({selectedDayReservations.length} reservation
              {selectedDayReservations.length > 1 ? "s" : ""})
            </span>
          )}
        </h3>

        {selectedDayReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucune reservation pour ce jour
          </p>
        ) : (
          <div className="space-y-2">
            {selectedDayReservations.map((resa) => {
              const resaStatus = resa.status ?? "pending";
              const status =
                statusConfig[resaStatus] ?? statusConfig.pending;
              const typeLabel = typeLabels[resa.type ?? ""] ?? resa.type;

              return (
                <Card
                  key={resa.id}
                  size="sm"
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onSelectReservation(resa.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectReservation(resa.id);
                    }
                  }}
                >
                  <CardContent className="flex items-center gap-3">
                    {/* Time */}
                    <div className="flex items-center gap-1 text-sm font-medium min-w-[3.5rem]">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {resa.time.slice(0, 5)}
                    </div>

                    {/* Customer name */}
                    <span className="flex-1 truncate text-sm font-medium">
                      {resa.customer_name}
                    </span>

                    {/* Party size */}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {resa.party_size}
                    </span>

                    {/* Status badge */}
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 border ${status.className}`}
                    >
                      {status.label}
                    </Badge>

                    {/* Type badge */}
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 hidden sm:inline-flex"
                    >
                      {typeLabel}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
