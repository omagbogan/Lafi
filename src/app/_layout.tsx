import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet } from "react-native";
import { ArticlesProvider } from "../store/ArticlesContext";
import { AuthProvider } from "../store/AuthContext";
import { CartProvider } from "../store/CartContext";
import { FavoritesProvider } from "../store/FavoritesContext";
import { OrdersProvider } from "../store/OrdersContext";

// Empêche le splash screen natif de disparaître avant que l'app soit prête.
// Encapsulé dans .catch() pour éviter les rejets non interceptés au boot natif.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [splashVisible, setSplashVisible] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // 1. Déclenchement standard dès que les polices sont chargées (ou en erreur)
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
      setAppReady(true);

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          setSplashVisible(false);
        });
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [loaded, error, fadeAnim]);

  // 2. Sécurité absolue : sur un appareil physique ou réseau lent, on ne bloque jamais
  // l'application indéfiniment. Au bout de 2s, on débloque automatiquement l'accès.
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      setAppReady(true);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setSplashVisible(false);
      });
    }, 2000);

    return () => clearTimeout(safetyTimer);
  }, [fadeAnim]);

  if (!loaded && !error && !appReady) {
    return null;
  }

  return (
    <AuthProvider>
      <ArticlesProvider>
        <FavoritesProvider>
          <CartProvider>
            <OrdersProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }} />

              {splashVisible && (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.splashContainer,
                    { opacity: fadeAnim },
                  ]}
                  pointerEvents="none"
                >
                  <Image
                    source={require("../../assets/images/lafi-logo-horizontal.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </Animated.View>
              )}
            </OrdersProvider>
          </CartProvider>
        </FavoritesProvider>
      </ArticlesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999999,
  },
  logoImage: {
    width: 250,
    height: 100,
  },
});
