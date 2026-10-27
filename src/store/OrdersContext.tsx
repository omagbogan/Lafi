import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { Alert } from "react-native";
import { api, Order } from "../services/api";
import { CartItem, DeliveryMode } from "./CartContext";

export type { Order } from "../services/api";

type OrdersContextType = {
  orders: Order[];
  lastOrderId: string | null;
  refreshOrders: () => Promise<void>;
  addOrder: (items: CartItem[], mode: DeliveryMode) => Promise<string>;
  setStatus: (id: string, status: "accepted" | "refused") => Promise<void>;
};

const OrdersContext = createContext<OrdersContextType | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    try {
      setOrders(await api.getMyOrders());
    } catch {
      // silencieux : on garde la liste précédente
    }
  }, []);

  const addOrder = async (items: CartItem[], mode: DeliveryMode) => {
    const order = await api.createOrder(
      mode,
      items.map((i) => ({ articleId: i.article.id, qty: i.qty })),
    );
    setLastOrderId(order.id);
    return order.id;
  };

  const setStatus = async (id: string, status: "accepted" | "refused") => {
    try {
      await api.setOrderStatus(id, status);
      await refreshOrders();
    } catch (e) {
      Alert.alert("Action impossible", e instanceof Error ? e.message : "Réessayez.");
    }
  };

  return (
    <OrdersContext.Provider value={{ orders, lastOrderId, refreshOrders, addOrder, setStatus }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) throw new Error("useOrders doit être utilisé dans OrdersProvider");
  return context;
}