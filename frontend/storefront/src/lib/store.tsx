'use client';
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';

export interface CartItem {
  productId: number;
  slug: string;
  sku: string;
  name: string;
  brand: string | null;
  price: number;
  available: number;
  qty: number;
}

export interface CarSelection {
  vehicleId: number;
  label: string; // «Audi A4»
  sub: string;   // «2016»
}

interface Store {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'qty'>) => void;
  setQty: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  car: CarSelection | null;
  setCar: (car: CarSelection | null) => void;
  toast: string;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [car, setCarState] = useState<CarSelection | null>(null);
  const [toast, setToast] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('sacramento.cart');
      const savedCar = localStorage.getItem('sacramento.car');
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedCar) setCarState(JSON.parse(savedCar));
    } catch { /* повреждённый storage игнорируем */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem('sacramento.cart', JSON.stringify(cart));
  }, [cart, loaded]);

  const setCar = useCallback((next: CarSelection | null) => {
    setCarState(next);
    if (next) localStorage.setItem('sacramento.car', JSON.stringify(next));
    else localStorage.removeItem('sacramento.car');
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }, []);

  const addToCart = useCallback((item: Omit<CartItem, 'qty'>) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        return prev.map(i => i.productId === item.productId
          ? { ...i, qty: Math.min(i.qty + 1, i.available) } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    setCart(prev => qty <= 0
      ? prev.filter(i => i.productId !== productId)
      : prev.map(i => i.productId === productId
          ? { ...i, qty: Math.min(qty, i.available) } : i));
  }, []);

  const removeItem = useCallback((productId: number) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo<Store>(() => ({
    cart, addToCart, setQty, removeItem, clearCart,
    cartCount: cart.reduce((a, i) => a + i.qty, 0),
    subtotal: cart.reduce((a, i) => a + i.price * i.qty, 0),
    car, setCar, toast, showToast,
  }), [cart, car, toast, addToCart, setQty, removeItem, clearCart, setCar, showToast]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore вне StoreProvider');
  return ctx;
}
