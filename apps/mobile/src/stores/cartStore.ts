import { create } from 'zustand';
import { v4 as uuid } from 'react-native-uuid';

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number; // cents, includes modifiers
  modifierIds: string[];
  modifierNames: string[];
  specialInstructions?: string;
}

interface CartState {
  items: CartItem[];
  locationId: string | null;

  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setLocationId: (id: string) => void;

  // Computed
  subtotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  locationId: null,

  addItem: (item) => {
    set((state) => ({
      items: [...state.items, { ...item, id: String(uuid()) }],
    }));
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    }));
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    }));
  },

  clearCart: () => set({ items: [] }),

  setLocationId: (id) => {
    const current = get().locationId;
    if (current && current !== id) {
      // Switching locations clears cart
      set({ items: [], locationId: id });
    } else {
      set({ locationId: id });
    }
  },

  subtotal: () => {
    return get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  },

  itemCount: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },
}));
