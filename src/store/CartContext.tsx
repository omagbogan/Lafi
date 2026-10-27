import { createContext, ReactNode, useContext, useState } from "react";
import { Article, DELIVERY_FEE } from "../data/articles";

export type CartItem = { article: Article; qty: number };
export type DeliveryMode = "pickup" | "yango";

type CartContextType = {
  items: CartItem[];
  shop: string | null;
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  mode: DeliveryMode;
  setMode: (mode: DeliveryMode) => void;
  addItem: (article: Article, qty: number) => boolean;
  startNew: (article: Article, qty: number) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mode, setMode] = useState<DeliveryMode>("pickup");

  // Renvoie false si l'article vient d'une autre boutique que celle du panier
  const addItem = (article: Article, qty: number) => {
    if (items.length > 0 && items[0].article.shop !== article.shop) return false;
    setItems((previous) => {
      const found = previous.find((i) => i.article.id === article.id);
      if (found) {
        return previous.map((i) =>
          i.article.id === article.id ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [...previous, { article, qty }];
    });
    return true;
  };

  const startNew = (article: Article, qty: number) => setItems([{ article, qty }]);

  const setQty = (id: string, qty: number) =>
    setItems((previous) =>
      qty <= 0
        ? previous.filter((i) => i.article.id !== id)
        : previous.map((i) => (i.article.id === id ? { ...i, qty } : i)),
    );

  const clear = () => setItems([]);

  const shop = items.length > 0 ? items[0].article.shop : null;
  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.article.price * i.qty, 0);
  const deliveryFee = mode === "yango" && items.length > 0 ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{ items, shop, count, subtotal, deliveryFee, total, mode, setMode, addItem, startNew, setQty, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart doit être utilisé dans CartProvider");
  return context;
}