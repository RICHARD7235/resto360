import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReservationView = "calendar" | "list";

export interface ReservationFilterState {
  status: string[];
  type: string[];
  search: string;
}

interface ReservationsState {
  // View mode
  view: ReservationView;
  setView: (view: ReservationView) => void;

  // Selected date (calendar)
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;

  // Filters
  filters: ReservationFilterState;
  setFilters: (filters: Partial<ReservationFilterState>) => void;
  resetFilters: () => void;

  // Detail sheet
  selectedReservationId: string | null;
  setSelectedReservationId: (id: string | null) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaultFilters: ReservationFilterState = {
  status: [],
  type: [],
  search: "",
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useReservationsStore = create<ReservationsState>((set) => ({
  view: "calendar",
  setView: (view) => set({ view }),

  selectedDate: new Date(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),

  filters: { ...defaultFilters },
  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  selectedReservationId: null,
  setSelectedReservationId: (selectedReservationId) =>
    set({ selectedReservationId }),
}));
