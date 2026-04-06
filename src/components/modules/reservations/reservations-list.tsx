"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database.types";

interface ReservationsListProps {
  reservations: Tables<"reservations">[];
  onSelectReservation: (id: string) => void;
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  confirmed: { label: "Confirmée", className: "bg-green-100 text-green-800 border-green-200" },
  seated: { label: "En salle", className: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Terminée", className: "bg-gray-100 text-gray-800 border-gray-200" },
  cancelled: { label: "Annulée", className: "bg-red-100 text-red-800 border-red-200" },
  no_show: { label: "No-show", className: "bg-red-100 text-red-800 border-red-200" },
};

const typeLabels: Record<string, string> = {
  restaurant: "Restaurant",
  salle: "Location salle",
  seminaire: "Séminaire",
};

export function ReservationsList({
  reservations,
  onSelectReservation,
}: ReservationsListProps) {
  if (reservations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">
          Aucune réservation trouvée
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Heure</TableHead>
          <TableHead>Client</TableHead>
          <TableHead className="text-center">Couverts</TableHead>
          <TableHead className="hidden md:table-cell">Type</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="hidden md:table-cell">Table</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reservations.map((resa) => {
          const status =
            statusConfig[resa.status ?? "pending"] ?? statusConfig.pending;
          const typeLabel = typeLabels[resa.type ?? ""] ?? resa.type;

          return (
            <TableRow
              key={resa.id}
              className="cursor-pointer min-h-[44px]"
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
              <TableCell className="font-medium">
                {format(parseISO(resa.date), "EEE d MMM", { locale: fr })}
              </TableCell>
              <TableCell>{resa.time.slice(0, 5)}</TableCell>
              <TableCell className="font-medium max-w-[200px] truncate">
                {resa.customer_name}
              </TableCell>
              <TableCell className="text-center">{resa.party_size}</TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline" className="text-[10px] h-5">
                  {typeLabel}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-[10px] h-5 border ${status.className}`}
                >
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {resa.table_number ?? "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
