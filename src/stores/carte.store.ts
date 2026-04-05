import { create } from "zustand";

type Tab = "carte" | "recettes";

interface CarteState {
  activeTab: Tab;
  selectedCategoryId: string | null;
  searchQuery: string;
  showUnavailable: boolean;
  selectedProductId: string | null;
  selectedRecipeId: string | null;
  productFormOpen: boolean;
  recipeFormOpen: boolean;
  setActiveTab: (tab: Tab) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setShowUnavailable: (show: boolean) => void;
  setSelectedProductId: (id: string | null) => void;
  setSelectedRecipeId: (id: string | null) => void;
  setProductFormOpen: (open: boolean) => void;
  setRecipeFormOpen: (open: boolean) => void;
}

export const useCarteStore = create<CarteState>((set) => ({
  activeTab: "carte",
  selectedCategoryId: null,
  searchQuery: "",
  showUnavailable: false,
  selectedProductId: null,
  selectedRecipeId: null,
  productFormOpen: false,
  recipeFormOpen: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowUnavailable: (show) => set({ showUnavailable: show }),
  setSelectedProductId: (id) => set({ selectedProductId: id }),
  setSelectedRecipeId: (id) => set({ selectedRecipeId: id }),
  setProductFormOpen: (open) => set({ productFormOpen: open }),
  setRecipeFormOpen: (open) => set({ recipeFormOpen: open }),
}));
