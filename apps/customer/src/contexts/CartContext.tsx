import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Cart } from '../services/api';
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from '../services/api';

interface CartCtx {
  cart: Cart | null; cartOpen: boolean; setCartOpen: (v: boolean) => void;
  refreshCart: (storeId: string) => Promise<void>;
  addItem: (storeId: string, menuItemId: string, qty: number, modIds: string[], note?: string) => Promise<void>;
  updateItem: (storeId: string, cartItemId: string, qty: number) => Promise<void>;
  removeItem: (storeId: string, cartItemId: string) => Promise<void>;
  emptyCart: (storeId: string) => Promise<void>;
}

const Ctx = createContext<CartCtx>({} as CartCtx);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const refreshCart = useCallback(async (storeId: string) => {
    try { setCart(await getCart(storeId)); } catch { setCart(null); }
  }, []);

  const addItem = useCallback(async (storeId: string, menuItemId: string, qty: number, modIds: string[], note?: string) => {
    setCart(await addToCart(storeId, menuItemId, qty, modIds, note));
    setCartOpen(true);
  }, []);

  const updateItem = useCallback(async (storeId: string, cartItemId: string, qty: number) => {
    setCart(await updateCartItem(storeId, cartItemId, qty));
  }, []);

  const removeItem = useCallback(async (storeId: string, cartItemId: string) => {
    setCart(await removeCartItem(storeId, cartItemId));
  }, []);

  const emptyCart = useCallback(async (storeId: string) => {
    await clearCart(storeId); setCart(null);
  }, []);

  return (
    <Ctx.Provider value={{ cart, cartOpen, setCartOpen, refreshCart, addItem, updateItem, removeItem, emptyCart }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => useContext(Ctx);
