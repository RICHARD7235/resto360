"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonnelTabs } from "@/components/modules/personnel/personnel-tabs";
import { TimeEntryTable } from "@/components/modules/personnel/time-entry-table";
import { TimeEntryForm } from "@/components/modules/personnel/time-entry-form";
import { WeeklyHoursSummary } from "@/components/modules/personnel/weekly-hours-summary";
import { usePersonnelStore, getMondayOfWeek } from "@/stores/personnel.store";
import {
  getTimeEntries,
  getStaffMembers,
} from "../actions";
import type { TimeEntry, StaffMemberWithPosition } from "@/types/personnel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PointagePage() {
  const { selectedPointageDate, setSelectedPointageDate } =
    usePersonnelStore();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<TimeEntry[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberWithPosition[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showWeekly, setShowWeekly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);

  const selectedDateStr = toIsoDate(selectedPointageDate);
  const weekStart = getMondayOfWeek(selectedPointageDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchDaily = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, staffData] = await Promise.all([
        getTimeEntries({
          dateFrom: selectedDateStr,
          dateTo: selectedDateStr,
        }),
        getStaffMembers({ isActive: true }),
      ]);
      setEntries(entriesData);
      setStaffMembers(staffData);
    } catch (error) {
      console.error("Erreur chargement pointages:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDateStr]);

  const fetchWeekly = useCallback(async () => {
    setLoading(true);
    try {
      const [weeklyData, staffData] = await Promise.all([
        getTimeEntries({
          dateFrom: toIsoDate(weekStart),
          dateTo: toIsoDate(weekEnd),
        }),
        getStaffMembers({ isActive: true }),
      ]);
      setWeeklyEntries(weeklyData);
      setStaffMembers(staffData);
    } catch (error) {
      console.error("Erreur chargement pointages hebdo:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toIsoDate(weekStart)]);

  useEffect(() => {
    if (showWeekly) {
      fetchWeekly();
    } else {
      fetchDaily();
    }
  }, [showWeekly, fetchDaily, fetchWeekly]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) {
      // Parse as local date to avoid timezone shift
      const [year, month, day] = e.target.value.split("-").map(Number);
      setSelectedPointageDate(new Date(year, month - 1, day));
    }
  }

  function handleEdit(entry: TimeEntry) {
    setEditEntry(entry);
    setFormOpen(true);
  }

  function handleNew() {
    setEditEntry(null);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditEntry(null);
  }

  function handleSaved() {
    if (showWeekly) {
      fetchWeekly();
    } else {
      fetchDaily();
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Personnel & Planning
          </h1>
          <p className="text-muted-foreground">
            Gestion du personnel, plannings et pointages
          </p>
        </div>
        <Button onClick={handleNew} className="min-h-11 gap-2">
          <Plus className="h-4 w-4" />
          Nouveau pointage
        </Button>
      </div>

      {/* Tab navigation */}
      <PersonnelTabs />

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Date picker */}
        <div className="space-y-1.5">
          <Label htmlFor="pointage-date" className="text-sm font-medium">
            Date
          </Label>
          <Input
            id="pointage-date"
            type="date"
            className="w-44 min-h-11"
            value={selectedDateStr}
            onChange={handleDateChange}
          />
        </div>

        {/* Weekly toggle */}
        <Button
          variant={showWeekly ? "default" : "outline"}
          className="min-h-11"
          onClick={() => setShowWeekly((v) => !v)}
        >
          Récap hebdo
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : showWeekly ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            Semaine du{" "}
            {weekStart.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
            })}{" "}
            au{" "}
            {weekEnd.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </h2>
          <WeeklyHoursSummary
            entries={weeklyEntries}
            staffMembers={staffMembers}
            weekStart={weekStart}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            Pointages du{" "}
            {selectedPointageDate.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </h2>
          <TimeEntryTable
            entries={entries}
            staffMembers={staffMembers}
            onEdit={handleEdit}
            onRefresh={fetchDaily}
          />
        </div>
      )}

      {/* Form sheet */}
      <TimeEntryForm
        open={formOpen}
        staffMembers={staffMembers}
        editEntry={editEntry}
        defaultDate={selectedDateStr}
        onClose={handleFormClose}
        onSaved={handleSaved}
      />
    </div>
  );
}
