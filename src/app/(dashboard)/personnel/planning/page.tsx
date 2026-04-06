"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { LayoutGrid, AlignLeft, BookTemplate, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonnelTabs } from "@/components/modules/personnel/personnel-tabs";
import { WeekSelector } from "@/components/modules/personnel/week-selector";
import { ScheduleGrid } from "@/components/modules/personnel/schedule-grid";
import { ScheduleTimeline } from "@/components/modules/personnel/schedule-timeline";
import { ShiftEditor } from "@/components/modules/personnel/shift-editor";
import { usePersonnelStore } from "@/stores/personnel.store";
import {
  getScheduleWeek,
  createScheduleWeek,
  publishScheduleWeek,
  getShiftsForWeek,
  getStaffMembers,
} from "../actions";
import type {
  Shift,
  ShiftPeriod,
  StaffMemberWithPosition,
  ScheduleWeek,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PlanningPage() {
  const { selectedWeekStart, scheduleView, setScheduleView } = usePersonnelStore();

  // Data
  const [scheduleWeek, setScheduleWeek] = useState<ScheduleWeek | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberWithPosition[]>([]);
  const [loading, setLoading] = useState(true);

  // Shift editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | undefined>(undefined);
  const [defaultStaffMemberId, setDefaultStaffMemberId] = useState<string | undefined>();
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [defaultPeriod, setDefaultPeriod] = useState<ShiftPeriod | undefined>();

  // Action loading states
  const [publishing, setPublishing] = useState(false);
  const [creating, setCreating] = useState(false);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const weekStartStr = format(selectedWeekStart, "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [weekData, staffData] = await Promise.all([
        getScheduleWeek(weekStartStr),
        getStaffMembers({ isActive: true }),
      ]);

      setScheduleWeek(weekData);
      setStaffMembers(staffData);

      if (weekData) {
        const shiftsData = await getShiftsForWeek(weekData.id);
        setShifts(shiftsData);
      } else {
        setShifts([]);
      }
    } catch (err) {
      toast.error((err as Error).message ?? "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [weekStartStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  async function handleCreateWeek() {
    setCreating(true);
    try {
      const week = await createScheduleWeek(weekStartStr);
      setScheduleWeek(week);
      setShifts([]);
      toast.success("Planning créé.");
    } catch (err) {
      toast.error((err as Error).message ?? "Erreur création planning.");
    } finally {
      setCreating(false);
    }
  }

  async function handlePublish() {
    if (!scheduleWeek) return;
    setPublishing(true);
    try {
      await publishScheduleWeek(scheduleWeek.id);
      setScheduleWeek({ ...scheduleWeek, status: "published" });
      toast.success("Planning publié !");
    } catch (err) {
      toast.error((err as Error).message ?? "Erreur publication.");
    } finally {
      setPublishing(false);
    }
  }

  // -------------------------------------------------------------------------
  // Shift editor
  // -------------------------------------------------------------------------

  function openCreateShift(staffMemberId: string, date: string, period: ShiftPeriod) {
    setEditingShift(undefined);
    setDefaultStaffMemberId(staffMemberId);
    setDefaultDate(date);
    setDefaultPeriod(period);
    setEditorOpen(true);
  }

  function openEditShift(shift: Shift) {
    setEditingShift(shift);
    setDefaultStaffMemberId(undefined);
    setDefaultDate(undefined);
    setDefaultPeriod(undefined);
    setEditorOpen(true);
  }

  function handleEditorClose() {
    setEditorOpen(false);
  }

  async function handleEditorSave() {
    await fetchData();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isDraft = scheduleWeek?.status === "draft";
  const isPublished = scheduleWeek?.status === "published";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Personnel & Planning</h1>
        <p className="text-muted-foreground">
          Planification hebdomadaire des équipes
        </p>
      </div>

      {/* Tab navigation */}
      <PersonnelTabs />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Week selector */}
        <WeekSelector />

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-input overflow-hidden">
          <Button
            variant={scheduleView === "grid" ? "default" : "ghost"}
            size="sm"
            className="rounded-none min-h-11 px-3 border-0"
            onClick={() => setScheduleView("grid")}
            aria-label="Vue grille"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={scheduleView === "timeline" ? "default" : "ghost"}
            size="sm"
            className="rounded-none min-h-11 px-3 border-0 border-l border-input"
            onClick={() => setScheduleView("timeline")}
            aria-label="Vue timeline"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            className="min-h-11 gap-2"
            disabled={!scheduleWeek}
            title="Appliquer un template (bientôt disponible)"
          >
            <BookTemplate className="h-4 w-4" />
            <span className="hidden sm:inline">Template</span>
          </Button>

          {scheduleWeek && isDraft && (
            <Button
              className="min-h-11 gap-2"
              onClick={handlePublish}
              disabled={publishing}
            >
              <Send className="h-4 w-4" />
              <span>{publishing ? "Publication…" : "Publier"}</span>
            </Button>
          )}

          {isPublished && (
            <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-medium px-3 py-1 min-h-9">
              Publié
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !scheduleWeek ? (
        /* No schedule for this week */
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">Aucun planning pour cette semaine</p>
            <p className="text-sm mt-1">Créez le planning pour commencer à ajouter des shifts.</p>
          </div>
          <Button
            className="min-h-11"
            onClick={handleCreateWeek}
            disabled={creating}
          >
            {creating ? "Création…" : "Créer le planning"}
          </Button>
        </div>
      ) : (
        /* Grid or Timeline */
        scheduleView === "grid" ? (
          <ScheduleGrid
            shifts={shifts}
            staffMembers={staffMembers}
            weekStart={selectedWeekStart}
            scheduleWeekId={scheduleWeek.id}
            onShiftClick={openEditShift}
            onCellClick={openCreateShift}
          />
        ) : (
          <ScheduleTimeline
            shifts={shifts}
            staffMembers={staffMembers}
            weekStart={selectedWeekStart}
          />
        )
      )}

      {/* Shift editor side panel */}
      {scheduleWeek && (
        <ShiftEditor
          open={editorOpen}
          onClose={handleEditorClose}
          scheduleWeekId={scheduleWeek.id}
          shift={editingShift}
          defaultStaffMemberId={defaultStaffMemberId}
          defaultDate={defaultDate}
          defaultPeriod={defaultPeriod}
          staffMembers={staffMembers}
          onSave={handleEditorSave}
        />
      )}
    </div>
  );
}
