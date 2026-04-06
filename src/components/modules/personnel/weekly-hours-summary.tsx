"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TimeEntry, StaffMemberWithPosition } from "@/types/personnel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WeeklyHoursSummaryProps {
  /** All time entries for the week (any day Mon–Sun). */
  entries: TimeEntry[];
  staffMembers: StaffMemberWithPosition[];
  /** Monday of the week being displayed (Date object). */
  weekStart: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Return ISO YYYY-MM-DD for the N-th day of a week (0 = Monday).
 */
function weekDay(weekStart: Date, offset: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length < 2) return null;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function calcNetMinutes(entry: TimeEntry): number {
  const inMin = timeToMinutes(entry.clock_in);
  const outMin = timeToMinutes(entry.clock_out);
  if (inMin === null || outMin === null) return 0;
  return Math.max(0, outMin - inMin - (entry.break_minutes ?? 0));
}

function formatHours(minutes: number): string {
  if (minutes === 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? m.toString().padStart(2, "0") : ""}`;
}

function formatHoursForce(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? m.toString().padStart(2, "0") : ""}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeeklyHoursSummary({
  entries,
  staffMembers,
  weekStart,
}: WeeklyHoursSummaryProps) {
  // Build the 7 ISO date strings for Mon–Sun
  const weekDates = Array.from({ length: 7 }, (_, i) => weekDay(weekStart, i));

  // Index entries by staff_member_id + date
  const entryMap = new Map<string, number>();
  for (const entry of entries) {
    const key = `${entry.staff_member_id}__${entry.date}`;
    entryMap.set(key, (entryMap.get(key) ?? 0) + calcNetMinutes(entry));
  }

  // Only show staff who have at least one entry in the week
  const activeStaffIds = new Set(
    entries
      .filter((e) => weekDates.includes(e.date))
      .map((e) => e.staff_member_id)
  );

  const activeStaff = staffMembers.filter((s) => activeStaffIds.has(s.id));

  if (activeStaff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Aucun pointage pour cette semaine.
        </p>
      </div>
    );
  }

  // Per-day column totals (across all staff)
  const dayTotals = weekDates.map((date) => {
    let total = 0;
    for (const staff of activeStaff) {
      total += entryMap.get(`${staff.id}__${date}`) ?? 0;
    }
    return total;
  });

  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border overflow-hidden overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[160px]">Employé</TableHead>
            {DAY_LABELS.map((label, i) => (
              <TableHead key={label} className="text-center min-w-[72px]">
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {weekDates[i].slice(5).replace("-", "/")}
                </div>
              </TableHead>
            ))}
            <TableHead className="text-right min-w-[80px]">Total</TableHead>
            <TableHead className="text-right min-w-[80px]">Contrat</TableHead>
            <TableHead className="text-right min-w-[80px]">Écart</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeStaff.map((staff) => {
            const staffWeekMinutes = weekDates.reduce((acc, date) => {
              return acc + (entryMap.get(`${staff.id}__${date}`) ?? 0);
            }, 0);

            // contract_hours is weekly hours (e.g. 35h → 35 * 60 min)
            const contractMinutes = staff.contract_hours
              ? staff.contract_hours * 60
              : null;

            const overtimeMinutes =
              contractMinutes !== null
                ? staffWeekMinutes - contractMinutes
                : null;

            return (
              <TableRow key={staff.id}>
                <TableCell className="font-medium">{staff.full_name}</TableCell>
                {weekDates.map((date) => {
                  const mins = entryMap.get(`${staff.id}__${date}`) ?? 0;
                  return (
                    <TableCell key={date} className="text-center text-sm">
                      {formatHours(mins)}
                    </TableCell>
                  );
                })}
                {/* Weekly total */}
                <TableCell className="text-right font-semibold">
                  {formatHoursForce(staffWeekMinutes)}
                </TableCell>
                {/* Contract hours */}
                <TableCell className="text-right text-muted-foreground">
                  {contractMinutes !== null
                    ? formatHoursForce(contractMinutes)
                    : "—"}
                </TableCell>
                {/* Overtime */}
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    overtimeMinutes === null
                      ? "text-muted-foreground"
                      : overtimeMinutes > 0
                      ? "text-red-600"
                      : overtimeMinutes < 0
                      ? "text-amber-600"
                      : "text-green-600"
                  )}
                >
                  {overtimeMinutes === null
                    ? "—"
                    : overtimeMinutes === 0
                    ? "0h"
                    : overtimeMinutes > 0
                    ? `+${formatHoursForce(overtimeMinutes)}`
                    : `-${formatHoursForce(Math.abs(overtimeMinutes))}`}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold">Total équipe</TableCell>
            {dayTotals.map((total, i) => (
              <TableCell key={i} className="text-center font-semibold">
                {formatHours(total)}
              </TableCell>
            ))}
            <TableCell className="text-right font-bold">
              {formatHoursForce(grandTotal)}
            </TableCell>
            <TableCell />
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
