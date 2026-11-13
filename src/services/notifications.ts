/**
 * src/services/notifications.ts
 * ------------------------------
 * Service de gestion des notifications natives du téléphone (iOS & Android).
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Intégration des APIs natives du téléphone : utilise `expo-notifications` pour
 *   alerter l'utilisateur hors de l'application (bannière système, vibration, son).
 * - Configuration Android 8.0+ : création d'un canal de notification système
 *   dédié (« Commandes Lafi ») avec importance MAX pour garantir l'affichage tête haute (heads-up).
 * - Exécution au premier plan et en arrière-plan : notification présentée même si l'application
 *   est ouverte, et déclenchable lors du polling d'arrière-plan.
 * - Tolérance aux pannes : encapsulation try/catch pour fonctionner silencieusement sur émulateur
 *   ou en cas de refus d'autorisation sans jamais bloquer l'application.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let isHandlerConfigured = false;

/**
 * Configure de manière sécurisée le gestionnaire de notifications au premier plan.
 * Encapsulé dans try/catch pour éviter tout plantage prématuré au démarrage natif Android.
 */
export function setupNotificationHandler() {
  if (isHandlerConfigured) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    isHandlerConfigured = true;
  } catch (err) {
    console.warn("[Notifications] Impossible d'initialiser le gestionnaire natif:", err);
  }
}

/**
 * Initialise les permissions système et configure le canal de notification Android.
 */
export async function initNotificationsAsync(): Promise<boolean> {
  try {
    setupNotificationHandler();

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("orders", {
        name: "Commandes Lafi",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2C64E8",
        sound: "default",
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch {
    return false;
  }
}

/**
 * Déclenche une notification système native sur l'appareil.
 * @param title Titre de l'alerte
 * @param body Message descriptif
 * @param data Données additionnelles (ex: id de commande, route)
 */
export async function notifyDeviceAsync(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: "default",
      },
      trigger: Platform.OS === "android" ? { channelId: "orders" } : null,
    });
  } catch (err) {
    // Évite tout plantage si les notifications ne sont pas autorisées
    console.warn("[Notifications] Impossible d'émettre la notification native:", err);
  }
}

/**
 * Écoute le clic de l'utilisateur sur une notification native pour le rediriger.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
) {
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (err) {
    console.warn("[Notifications] Impossible d'ajouter l'écouteur de réponse:", err);
    return { remove: () => { } } as any;
  }
}
