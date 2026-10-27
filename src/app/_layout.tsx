import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ArticlesProvider } from "../store/ArticlesContext";
import { CartProvider } from "../store/CartContext";
import { OrdersProvider } from "../store/OrdersContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

    return (
    <ArticlesProvider>
      <CartProvider>
        <OrdersProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </OrdersProvider>
      </CartProvider>
    </ArticlesProvider>
  );
}