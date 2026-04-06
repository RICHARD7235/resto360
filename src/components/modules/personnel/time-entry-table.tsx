"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { validateTimeEntry } from "@/app/(dashboard)/personnel/actions";
import {
  PERIOD_LABELS,
  type TimeEntry,
  type ShiftPeriod,
  type StaffMemberWithPosition,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TimeEntryTableProps {
  entries: TimeEntry[];
  staffMembers: StaffMemberWithPosition[];
  onEdit: (entry: TimeEntry) => void;
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse "HH:MM" or "HH:MM:SS" time string into total minutes since midnight.
 */
function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length < 2) return null;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Calculate net worked minutes: (clock_out - clock_in) - break_minutes.
 * Returns null if clock_in or clock_out is missing.
 */
function calcNetMinutes(entry: TimeEntry): number | null {
  const inMin = timeToMinutes(entry.clock_in);
  const outMin = timeToMinutes(entry.clock_out);
  if (inMin === null || outMin === null) return null;
  const raw = outMin - inMin;
  return Math.max(0, raw - (entry.break_minutes ?? 0));
}

/**
 * Format a duration in minutes as "Xh YY".
 */
function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

/**
 * Format a "HH:MM:SS" time string as "HH:MM".
 */
function formatTime(time: string | null): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeEntryTable({
  entries,
  staffMembers,
  onEdit,
  onRefresh,
}: TimeEntryTableProps) {
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const staffById = Object.fromEntries(staffMembers.map((s) => [s.id, s.full_name]));

  async function handleValidate(id: string) {
    setValidatingId(id);
    try {
      await validateTimeEntry(id);
      toast.success("Pointage validé");
      onRefresh();
    } catch (error) {
      toast.error("Erreur lors de la validation");
      console.error(error);
    } finally {
      setValidatingId(null);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">Aucun pointage pour cette journée.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employé</TableHead>
            <TableHead>Entrée</TableHead>
            <TableHead>Sortie</TableHead>
            <TableHead className="text-right">Pause (min)</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead>Période</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const netMinutes = calcNetMinutes(entry);
            const isValidated = entry.validated_by !== null;
            const isValidating = validatingId === entry.id;
            const periodLabel =
              PERIOD_LABELS[entry.period as ShiftPeriod] ?? entry.period;

            return (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {staffById[entry.staff_member_id] ?? entry.staff_member_id}
                </TableCell>
                <TableCell>{formatTime(entry.clock_in)}</TableCell>
                <TableCell>{formatTime(entry.clock_out)}</TableCell>
                <TableCell className="text-right">
                  {entry.break_minutes ?? 0}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatDuration(netMinutes)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{periodLabel}</Badge>
                </TableCell>
                <TableCell>
                  {isValidated ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
                      <Check className="h-3 w-3" />
                      Validé
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                      En attente
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!isValidated && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-9 gap-1 text-green-700 border-green-300 hover:bg-green-50"
                        disabled={isValidating}
                        onClick={() => handleValidate(entry.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Valider
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-9 gap-1"
                      onClick={() => onEdit(entry)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifier
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
