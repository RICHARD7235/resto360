import { create } from "zustand";

export type CaisseTab =
  | "dashboard"
  | "z-caisse"
  | "rapprochement"
  | "tva"
  | "tresorerie"
  | "historique";

interface CaisseState {
  // Navigation
  activeTab: CaisseTab;
  setActiveTab: (tab: CaisseTab) => void;

  // Z de caisse
  closingFormOpen: boolean;
  setClosingFormOpen: (open: boolean) => void;
  closingImportOpen: boolean;
  setClosingImportOpen: (open: boolean) => void;

  // Banque
  bankImportOpen: boolean;
  setBankImportOpen: (open: boolean) => void;

  // Trésorerie
  treasuryFormOpen: boolean;
  setTreasuryFormOpen: (open: boolean) => void;

  // Filtres
  periodFilter: "month" | "quarter" | "year" | "custom";
  setPeriodFilter: (period: "month" | "quarter" | "year" | "custom") => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useCaisseStore = create<CaisseState>((set) => ({
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab }),

  closingFormOpen: false,
  setClosingFormOpen: (open) => set({ closingFormOpen: open }),
  closingImportOpen: false,
  setClosingImportOpen: (open) => set({ closingImportOpen: open }),

  bankImportOpen: false,
  setBankImportOpen: (open) => set({ bankImportOpen: open }),

  treasuryFormOpen: false,
  setTreasuryFormOpen: (open) => set({ treasuryFormOpen: open }),

  periodFilter: "month",
  setPeriodFilter: (period) => set({ periodFilter: period }),
  dateFrom: "",
  setDateFrom: (date) => set({ dateFrom: date }),
  dateTo: "",
  setDateTo: (date) => set({ dateTo: date }),
  categoryFilter: "",
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
}));