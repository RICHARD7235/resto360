"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarGrid } from "../_components/calendar-grid";
import {
  formatExpiry,
  urgencyColor,
  urgencyLabel,
} from "@/lib/documents/format";
import type { DocumentCategory, DocumentWithStatus } from "@/types/documents";

interface CalendrierClientProps {
  categories: DocumentCategory[];
  documents: DocumentWithStatus[];
}

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function CalendrierClient({
  categories,
  documents,
}: CalendrierClientProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return documents;
    return documents.filter((d) => d.category_id === categoryFilter);
  }, [documents, categoryFilter]);

  const selectedDocs = useMemo(() => {
    if (!selectedDay) return [];
    const key = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`;
    return filtered.filter((d) => d.expires_at?.slice(0, 10) === key);
  }, [filtered, selectedDay]);

  function prevMonth() {
    setCurrentMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
    );
  }

  function goToday() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevMonth}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center text-lg font-semibold">
            {MONTH_LABELS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            Aujourd&apos;hui
          </Button>
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v ?? "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CalendarGrid
        documents={filtered}
        month={currentMonth}
        selectedDay={selectedDay}
        onSelectDay={(day) => setSelectedDay(day)}
      />

      {selectedDay && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold">
            Échéances du{" "}
            {selectedDay.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </h2>
          {selectedDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun document n&apos;expire ce jour.
            </p>
          ) : (
            <ul className="divide-y">
              {selectedDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {doc.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Expire le {formatExpiry(doc.expires_at)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={urgencyColor(doc.urgency_level)}
                  >
                    {urgencyLabel(doc.urgency_level)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
