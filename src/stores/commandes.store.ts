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
}

export interface CommandesState {
  // Table sélectionnée sur le plan de salle
  selectedTable: string | null;
  setSelectedTable: (table: string | null) => void;

  // Panier en cours de construction pour une nouvelle commande
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
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
      const existing = state.cart.find(
        (c) => c.product_id === item.product_id
      );
      if (existing) {
        // Increment quantity if product already in cart
        return {
          cart: state.cart.map((c) =>
            c.product_id === item.product_id
              ? { ...c, quantity: c.quantity + item.quantity }
              : c
          ),
        };
      }
      return { cart: [...state.cart, item] };
    }),

  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((c) => c.product_id !== productId),
    })),

  updateCartQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return {
          cart: state.cart.filter((c) => c.product_id !== productId),
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
