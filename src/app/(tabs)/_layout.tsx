import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useAuth } from "../../store/AuthContext";
import { useCart } from "../../store/CartContext";
import { useOrders } from "../../store/OrdersContext";
import { colors, fonts, shadows } from "../../theme";

export default function TabsLayout() {
  const { count } = useCart();
  const { merchant } = useAuth();
  const { orders } = useOrders();

  // Nombre de commandes en attente pour la boutique connectée
  const currentShopName = merchant?.shopName;
  const pendingCount = merchant
    ? orders.filter(
        (o) =>
          o.status === "pending" && (!currentShopName || !o.shop || o.shop === currentShopName),
      ).length
    : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          ...shadows.float,
        },
      }}
    >
      {/* 1. Accueil (Client) OU Ma Boutique (Commerçant) */}
      <Tabs.Screen
        name="index"
        options={{
          title: merchant ? "Ma Boutique" : "Accueil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                merchant
                  ? focused
                    ? "storefront"
                    : "storefront-outline"
                  : focused
                  ? "home"
                  : "home-outline"
              }
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      {/* 2. Carte (uniquement visible par les clients) */}
      <Tabs.Screen
        name="carte"
        options={{
          href: merchant ? null : "/carte",
          title: "Carte",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={22} color={color as string} />
          ),
        }}
      />

      {/* 3. Panier (uniquement visible par les clients) */}
      <Tabs.Screen
        name="panier"
        options={{
          href: merchant ? null : "/panier",
          title: "Panier",
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: "#FFFFFF",
            fontFamily: fonts.bold,
            fontSize: 10,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cart" : "cart-outline"} size={22} color={color as string} />
          ),
        }}
      />

      {/* 4. Commandes reçues (uniquement visible par les commerçants) */}
      <Tabs.Screen
        name="commandes"
        options={{
          href: merchant ? "/commandes" : null,
          title: "Commandes",
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            color: "#FFFFFF",
            fontFamily: fonts.bold,
            fontSize: 10,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      {/* 5. Profil (Client) OU Mon Compte (Commerçant) */}
      <Tabs.Screen
        name="profil"
        options={{
          title: merchant ? "Mon Compte" : "Profil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
