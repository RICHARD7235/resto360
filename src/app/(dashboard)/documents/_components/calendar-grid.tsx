"use client";

import type { DocumentWithStatus, UrgencyLevel } from "@/types/documents";
import { cn } from "@/lib/utils";

interface CalendarGridProps {
  documents: DocumentWithStatus[];
  month: Date;
  selectedDay?: Date | null;
  onSelectDay?: (day: Date, docs: DocumentWithStatus[]) => void;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function urgencyDot(level: UrgencyLevel): string {
  switch (level) {
    case "expired":
      return "bg-red-500";
    case "critical":
      return "bg-orange-500";
    case "warning":
      return "bg-yellow-500";
    case "info":
      return "bg-blue-500";
    case "ok":
    default:
      return "bg-green-500";
  }
}

function urgencyRank(level: UrgencyLevel): number {
  const order: Record<UrgencyLevel, number> = {
    expired: 0,
    critical: 1,
    warning: 2,
    info: 3,
    ok: 4,
  };
  return order[level];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarGrid({
  documents,
  month,
  selectedDay,
  onSelectDay,
}: CalendarGridProps) {
  const year = month.getFullYear();
  const monthIdx = month.getMonth();

  // Group docs by yyyy-mm-dd
  const docsByDay = new Map<string, DocumentWithStatus[]>();
  for (const doc of documents) {
    if (!doc.expires_at) continue;
    const key = doc.expires_at.slice(0, 10);
    const list = docsByDay.get(key) ?? [];
    list.push(doc);
    docsByDay.set(key, list);
  }

  // First day of month, normalized to Monday=0
  const firstOfMonth = new Date(year, monthIdx, 1);
  const jsDow = firstOfMonth.getDay(); // 0=Sun
  const offset = (jsDow + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - offset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ date: null });
    } else {
      cells.push({ date: new Date(year, monthIdx, dayNum) });
    }
  }

  const today = new Date();

  return (
    <div className="rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          if (!cell.date) {
            return (
              <div
                key={idx}
                className="h-24 border-b border-r bg-muted/20 last:border-r-0"
              />
            );
          }
          const date = cell.date;
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          const dayDocs = docsByDay.get(key) ?? [];
          const isToday = isSameDay(date, today);
          const isSelected = selectedDay ? isSameDay(date, selectedDay) : false;
          const sorted = [...dayDocs].sort(
            (a, b) => urgencyRank(a.urgency_level) - urgencyRank(b.urgency_level)
          );
          const topUrgency = sorted[0]?.urgency_level;
          const isLastCol = (idx + 1) % 7 === 0;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDay?.(date, dayDocs)}
              className={cn(
                "h-24 border-b border-r p-2 text-left transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
                isLastCol && "border-r-0",
                isSelected && "bg-accent ring-2 ring-primary",
                isToday && !isSelected && "bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary font-bold"
                  )}
                >
                  {date.getDate()}
                </span>
                {dayDocs.length > 0 && topUrgency && (
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      urgencyDot(topUrgency)
                    )}
                  />
                )}
              </div>
              {dayDocs.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {sorted.slice(0, 2).map((doc) => (
                    <div
                      key={doc.id}
                      className="truncate text-[10px] text-muted-foreground"
                      title={doc.title}
                    >
                      {doc.title}
                    </div>
                  ))}
                  {dayDocs.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{dayDocs.length - 2}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
