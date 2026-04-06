import { create } from "zustand";

interface FournisseursState {
  searchQuery: string;
  showInactive: boolean;
  supplierFormOpen: boolean;
  selectedSupplierId: string | null;
  catalogItemFormOpen: boolean;
  selectedCatalogItemId: string | null;
  setSearchQuery: (query: string) => void;
  setShowInactive: (show: boolean) => void;
  setSupplierFormOpen: (open: boolean) => void;
  setSelectedSupplierId: (id: string | null) => void;
  setCatalogItemFormOpen: (open: boolean) => void;
  setSelectedCatalogItemId: (id: string | null) => void;
}

export const useFournisseursStore = create<FournisseursState>((set) => ({
  searchQuery: "",
  showInactive: false,
  supplierFormOpen: false,
  selectedSupplierId: null,
  catalogItemFormOpen: false,
  selectedCatalogItemId: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowInactive: (show) => set({ showInactive: show }),
  setSupplierFormOpen: (open) => set({ supplierFormOpen: open }),
  setSelectedSupplierId: (id) => set({ selectedSupplierId: id }),
  setCatalogItemFormOpen: (open) => set({ catalogItemFormOpen: open }),
  setSelectedCatalogItemId: (id) => set({ selectedCatalogItemId: id }),
}));
