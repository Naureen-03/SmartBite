// Cart context: single-restaurant cart persisted to localStorage. Checkout posts the
// lines to the backend, which owns the authoritative pricing.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { MenuItem } from "./types";

export interface CartLine {
  item: MenuItem;
  qty: number;
}

interface CartState {
  restaurantId: string | null;
  restaurantName: string;
  lines: CartLine[];
}

interface CartApi extends CartState {
  count: number;
  subtotal: number;
  add: (item: MenuItem) => boolean; // returns true when the cart was cleared for a new restaurant
  setQty: (itemId: string, qty: number) => void;
  qtyOf: (itemId: string) => number;
  clear: () => void;
}

const EMPTY: CartState = { restaurantId: null, restaurantName: "", lines: [] };
const STORAGE_KEY = "smartbite-cart";

function load(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CartState;
  } catch {
    // ignore corrupted storage
  }
  return EMPTY;
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(load);

  const persist = useCallback((next: CartState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — cart stays in memory
    }
  }, []);

  const add = useCallback(
    (item: MenuItem, restaurantName?: string): boolean => {
      if (state.restaurantId && state.restaurantId !== item.restaurant_id) {
        persist({
          restaurantId: item.restaurant_id,
          restaurantName: restaurantName ?? "",
          lines: [{ item, qty: 1 }],
        });
        return true;
      }
      const existing = state.lines.find((l) => l.item.id === item.id);
      const next = existing
        ? state.lines.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l))
        : [...state.lines, { item, qty: 1 }];
      persist({ restaurantId: item.restaurant_id, restaurantName: restaurantName ?? state.restaurantName, lines: next });
      return false;
    },
    [state, persist],
  );

  const setQty = useCallback(
    (itemId: string, qty: number) => {
      const lines = state.lines
        .map((l) => (l.item.id === itemId ? { ...l, qty } : l))
        .filter((l) => l.qty > 0);
      if (!lines.length) {
        persist(EMPTY);
        return;
      }
      persist({ ...state, lines });
    },
    [state, persist],
  );

  const qtyOf = useCallback(
    (itemId: string) => state.lines.find((l) => l.item.id === itemId)?.qty ?? 0,
    [state],
  );

  const clear = useCallback(() => persist(EMPTY), [persist]);

  const value = useMemo<CartApi>(() => {
    const count = state.lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = state.lines.reduce((n, l) => n + l.item.price * l.qty, 0);
    return {
      ...state,
      count,
      subtotal,
      add,
      setQty,
      qtyOf,
      clear,
    };
  }, [state, add, setQty, qtyOf, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
