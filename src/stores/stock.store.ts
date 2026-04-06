import { create } from "zustand";

type StockTab = "inventaire" | "mouvements" | "achats";

interface StockState {
  activeTab: StockTab;
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  trackingFilter: string;
  stockItemFormOpen: boolean;
  selectedStockItemId: string | null;
  movementFormOpen: boolean;
  importDialogOpen: boolean;
  setActiveTab: (tab: StockTab) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (cat: string) => void;
  setStatusFilter: (status: string) => void;
  setTrackingFilter: (mode: string) => void;
  setStockItemFormOpen: (open: boolean) => void;
  setSelectedStockItemId: (id: string | null) => void;
  setMovementFormOpen: (open: boolean) => void;
  setImportDialogOpen: (open: boolean) => void;
}

export const useStockStore = create<StockState>((set) => ({
  activeTab: "inventaire",
  searchQuery: "",
  categoryFilter: "",
  statusFilter: "",
  trackingFilter: "",
  stockItemFormOpen: false,
  selectedStockItemId: null,
  movementFormOpen: false,
  importDialogOpen: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setTrackingFilter: (mode) => set({ trackingFilter: mode }),
  setStockItemFormOpen: (open) => set({ stockItemFormOpen: open }),
  setSelectedStockItemId: (id) => set({ selectedStockItemId: id }),
  setMovementFormOpen: (open) => set({ movementFormOpen: open }),
  setImportDialogOpen: (open) => set({ importDialogOpen: open }),
}));
