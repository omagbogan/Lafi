import { Platform } from "react-native";

/**
 * src/config.ts
 * -------------
 * Détection dynamique de l'URL de l'API backend :
 * 1. Variable d'environnement EXPO_PUBLIC_API_URL si définie (ex: build de production VPS).
 * 2. Sur le Web en production (servi par Nginx sur port 80/443), utilise l'origine du site (reverse-proxy).
 * 3. En local / Wi-Fi, utilise l'adresse IP de la machine de développement (192.168.1.5:8000).
 */
export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    // Si servi par Nginx en production (ports standards 80/443 ou domaine sans :8081)
    if (window.location.port !== "8081") {
      return window.location.origin;
    }
  }

  // Adresse IP locale du PC sur le réseau Wi-Fi actuel
  // Sur un émulateur Android pur, basculer sur http://10.0.2.2:8000 si besoin
  return "http://192.168.1.5:8000";
}

export const API_URL = getApiUrl();

