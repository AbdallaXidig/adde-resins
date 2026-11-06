"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image?: string;
  grade?: string;
  packaging?: string;
  quantity: number;
  unit: "KG" | "MT";
};

type Ctx = {
  items: CartItem[];
  ready: boolean;
  count: number;
  add: (item: CartItem) => void;
  update: (productId: string, patch: Partial<CartItem>) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "adde-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      /* storage blocked or corrupt: start with an empty cart */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage blocked: the cart still works for this page view */
    }
  }, [items, ready]);

  const add = useCallback((item: CartItem) => {
    setItems((cur) => {
      const existing = cur.find((i) => i.productId === item.productId);
      if (!existing) return [...cur, item];
      return cur.map((i) =>
        i.productId === item.productId && i.unit === item.unit ? { ...i, quantity: i.quantity + item.quantity } : i,
      );
    });
  }, []);
  const update = useCallback((productId: string, patch: Partial<CartItem>) => {
    setItems((cur) => cur.map((i) => (i.productId === productId ? { ...i, ...patch } : i)));
  }, []);
  const remove = useCallback((productId: string) => setItems((cur) => cur.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, ready, count: items.length, add, update, remove, clear }),
    [items, ready, add, update, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
