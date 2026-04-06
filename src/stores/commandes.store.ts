import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  notes: string;
  menu_id?: string;
  menu_name?: string;
  is_menu_header?: boolean;
}

export interface CommandesState {
  // Table sélectionnée sur le plan de salle
  selectedTable: string | null;
  setSelectedTable: (table: string | null) => void;

  // Panier en cours de construction pour une nouvelle commande
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  addMenuToCart: (header: CartItem, items: CartItem[]) => void;
  removeFromCart: (productId: string) => void;
  removeMenuFromCart: (menuId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Catégorie active dans la grille produits
  activeCategory: string | null;
  setActiveCategory: (id: string | null) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCommandesStore = create<CommandesState>((set) => ({
  selectedTable: null,
  setSelectedTable: (selectedTable) => set({ selectedTable }),

  cart: [],
  addToCart: (item) =>
    set((state) => {
      // Don't merge menu items with regular items
      if (item.menu_id) {
        return { cart: [...state.cart, item] };
      }
      const existing = state.cart.find(
        (c) => c.product_id === item.product_id && !c.menu_id
      );
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c.product_id === item.product_id && !c.menu_id
              ? { ...c, quantity: c.quantity + item.quantity }
              : c
          ),
        };
      }
      return { cart: [...state.cart, item] };
    }),

  addMenuToCart: (header, items) =>
    set((state) => ({
      cart: [...state.cart, header, ...items],
    })),

  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((c) => c.product_id !== productId || c.menu_id),
    })),

  removeMenuFromCart: (menuId) =>
    set((state) => ({
      cart: state.cart.filter((c) => c.menu_id !== menuId),
    })),

  updateCartQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        // Check if this is a menu header — remove all menu items
        const item = state.cart.find((c) => c.product_id === productId);
        if (item?.is_menu_header && item.menu_id) {
          return {
            cart: state.cart.filter((c) => c.menu_id !== item.menu_id),
          };
        }
        return {
          cart: state.cart.filter((c) => c.product_id !== productId),
        };
      }
      // For menu headers, update quantity on all items in the group
      const item = state.cart.find((c) => c.product_id === productId);
      if (item?.is_menu_header && item.menu_id) {
        return {
          cart: state.cart.map((c) =>
            c.menu_id === item.menu_id ? { ...c, quantity } : c
          ),
        };
      }
      return {
        cart: state.cart.map((c) =>
          c.product_id === productId ? { ...c, quantity } : c
        ),
      };
    }),

  clearCart: () => set({ cart: [] }),

  activeCategory: null,
  setActiveCategory: (activeCategory) => set({ activeCategory }),
}));
