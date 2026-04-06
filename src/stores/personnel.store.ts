import { create } from "zustand";
import type { Department, ContractType } from "@/types/personnel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScheduleView = "grid" | "timeline";

export type PersonnelTab =
  | "dashboard"
  | "equipe"
  | "planning"
  | "postes"
  | "conges"
  | "pointage"
  | "documents";

export interface PersonnelFilters {
  department: Department | "";
  contractType: ContractType | "";
  isActive: boolean | null;
  search: string;
}

interface PersonnelState {
  // Active tab
  activeTab: PersonnelTab;
  setActiveTab: (tab: PersonnelTab) => void;

  // Schedule view
  scheduleView: ScheduleView;
  setScheduleView: (view: ScheduleView) => void;

  // Selected week (planning)
  selectedWeekStart: Date;
  setSelectedWeekStart: (date: Date) => void;

  // Filters
  filters: PersonnelFilters;
  setFilters: (filters: Partial<PersonnelFilters>) => void;
  resetFilters: () => void;

  // Pointage date
  selectedPointageDate: Date;
  setSelectedPointageDate: (date: Date) => void;

  // Leave year
  selectedLeaveYear: number;
  setSelectedLeaveYear: (year: number) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaultFilters: PersonnelFilters = {
  department: "",
  contractType: "",
  isActive: null,
  search: "",
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Sunday = 0 → offset 6, Monday = 1 → offset 0, etc.
  const offset = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePersonnelStore = create<PersonnelState>((set) => ({
  activeTab: "dashboard",
  setActiveTab: (activeTab) => set({ activeTab }),

  scheduleView: "grid",
  setScheduleView: (scheduleView) => set({ scheduleView }),

  selectedWeekStart: getMondayOfWeek(new Date()),
  setSelectedWeekStart: (selectedWeekStart) => set({ selectedWeekStart }),

  filters: { ...defaultFilters },
  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  selectedPointageDate: new Date(),
  setSelectedPointageDate: (selectedPointageDate) =>
    set({ selectedPointageDate }),

  selectedLeaveYear: new Date().getFullYear(),
  setSelectedLeaveYear: (selectedLeaveYear) => set({ selectedLeaveYear }),
}));
