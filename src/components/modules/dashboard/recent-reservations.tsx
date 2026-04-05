"use client";

import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Users, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database.types";

interface RecentReservationsProps {
  reservations: Tables<"reservations">[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "outline" },
  confirmed: { label: "Confirmée", variant: "default" },
  seated: { label: "En salle", variant: "secondary" },
  completed: { label: "Terminée", variant: "secondary" },
  cancelled: { label: "Annulée", variant: "destructive" },
  no_show: { label: "No-show", variant: "destructive" },
};

const typeLabels: Record<string, string> = {
  restaurant: "",
  salle: "Location salle",
  seminaire: "Séminaire",
};

function formatDateLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return "Demain";
  return format(date, "EEEE d MMM", { locale: fr });
}

export function RecentReservations({ reservations }: RecentReservationsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Prochaines réservations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reservations.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucune réservation à venir
            </p>
          )}
          {reservations.slice(0, 8).map((resa) => {
            const status = statusConfig[resa.status] ?? statusConfig.pending;
            const typeLabel = typeLabels[resa.type];

            return (
              <div
                key={resa.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {resa.customer_name}
                    </span>
                    <Badge variant={status.variant} className="text-[10px] h-5">
                      {status.label}
                    </Badge>
                    {typeLabel && (
                      <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary">
                        {typeLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatDateLabel(resa.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {resa.time.slice(0, 5)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {resa.party_size} pers.
                    </span>
                  </div>
                  {resa.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate italic">
                      {resa.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
