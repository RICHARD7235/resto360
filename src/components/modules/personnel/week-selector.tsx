"use client";

import { getISOWeek, addWeeks, subWeeks, format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePersonnelStore, getMondayOfWeek } from "@/stores/personnel.store";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeekSelector() {
  const { selectedWeekStart, setSelectedWeekStart } = usePersonnelStore();

  const weekNumber = getISOWeek(selectedWeekStart);
  const weekEnd = addDays(selectedWeekStart, 6);

  // Format: "7-13 avril 2025" or "28 avr.-3 mai 2025" if cross-month
  const startMonth = format(selectedWeekStart, "MMMM", { locale: fr });
  const endMonth = format(weekEnd, "MMMM", { locale: fr });

  let rangeLabel: string;
  if (startMonth === endMonth) {
    const year = format(weekEnd, "yyyy");
    rangeLabel = `${format(selectedWeekStart, "d")}-${format(weekEnd, "d")} ${startMonth} ${year}`;
  } else {
    const year = format(weekEnd, "yyyy");
    rangeLabel = `${format(selectedWeekStart, "d MMM", { locale: fr })}-${format(weekEnd, "d MMM", { locale: fr })} ${year}`;
  }

  function goToPrevWeek() {
    setSelectedWeekStart(subWeeks(selectedWeekStart, 1));
  }

  function goToNextWeek() {
    setSelectedWeekStart(addWeeks(selectedWeekStart, 1));
  }

  function goToCurrentWeek() {
    setSelectedWeekStart(getMondayOfWeek(new Date()));
  }

  const isCurrentWeek =
    getMondayOfWeek(new Date()).toDateString() === selectedWeekStart.toDateString();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="min-h-11 min-w-11"
        onClick={goToPrevWeek}
        aria-label="Semaine précédente"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 px-2 py-2 rounded-lg border border-input bg-background min-h-11">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Sem.&nbsp;{weekNumber}
        </span>
        <span className="text-muted-foreground">—</span>
        <span className="text-sm font-semibold whitespace-nowrap">{rangeLabel}</span>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="min-h-11 min-w-11"
        onClick={goToNextWeek}
        aria-label="Semaine suivante"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentWeek && (
        <Button
          variant="outline"
          className="min-h-11 text-sm"
          onClick={goToCurrentWeek}
        >
          Aujourd&apos;hui
        </Button>
      )}
    </div>
  );
}
