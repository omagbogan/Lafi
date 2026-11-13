/**
 * src/components/NotificationsModal.tsx
 * -------------------------------------
 * Centre de notifications contextuel et dynamique pour Client et Commerçant.
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Notifications différenciées par rôle :
 *   - Commerçant : nouvelles commandes reçues (pending), rappels de préparation (accepted).
 *   - Client : suivi d'avancement (acceptée, en livraison Yango, prête pour retrait, refusée).
 * - Badge rouge automatique : calcul en direct des alertes non lues.
 * - Marquer tout comme lu : réinitialisation instantanée du badge dès l'ouverture du panneau
 *   avec persistance dans AsyncStorage (@lafi_read_notifications).
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../store/AuthContext";
import { useOrders } from "../store/OrdersContext";
import { colors, fonts, radius, shadows, spacing } from "../theme";
import { formatPrice } from "../utils/format";
import { timeAgo } from "../utils/time";

const READ_NOTIFS_KEY = "@lafi_read_notifications";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route?: string;
};

/**
 * Hook retournant les notifications contextuelles et le compteur non lu.
 */
export function useNotifications() {
  const { customer, merchant } = useAuth();
  const { orders } = useOrders();
  const [readIds, setReadIds] = useState<string[]>([]);

  // Charge les notifications lues depuis AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(READ_NOTIFS_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setReadIds(parsed.map(String));
        }
      })
      .catch(() => {});
  }, []);

  const saveReadIds = useCallback((newIds: string[]) => {
    setReadIds(newIds);
    AsyncStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(newIds)).catch(() => {});
  }, []);

  // Génération dynamique des alertes selon le rôle et les commandes
  const notifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    if (merchant) {
      // Filtrer les commandes de la boutique du commerçant
      const shopOrders = merchant.shopName
        ? orders.filter((o) => !o.shop || o.shop === merchant.shopName)
        : orders;

      // Commandes en attente
      shopOrders
        .filter((o) => o.status === "pending")
        .forEach((o) => {
          list.push({
            id: `merchant-pending-${o.id}`,
            title: `Nouvelle commande #${o.id}`,
            message: `${o.customerName || "Un client"} a commandé pour ${formatPrice(o.total || o.subtotal)}. En attente de validation.`,
            time: timeAgo(o.createdAt),
            icon: "receipt-outline",
            color: colors.primary,
            route: "/(tabs)/commandes",
          });
        });

      // Commandes acceptées selon le mode et l'avancement
      shopOrders
        .filter((o) => o.status === "accepted")
        .forEach((o) => {
          if (o.mode === "pickup") {
            list.push({
              id: `merchant-accepted-pickup-${o.id}`,
              title: `Commande #${o.id} en cours`,
              message: "Articles prêts. En attente de retrait par le client avec son code secret.",
              time: timeAgo(o.createdAt),
              icon: "storefront-outline",
              color: colors.open,
              route: "/(tabs)/commandes",
            });
          } else if (!o.driverDispatched) {
            list.push({
              id: `merchant-waiting-driver-${o.id}`,
              title: `Commande #${o.id} acceptée`,
              message: "En attente : le client commande son livreur sur Yango.",
              time: timeAgo(o.createdAt),
              icon: "time-outline",
              color: colors.primary,
              route: "/(tabs)/commandes",
            });
          } else if (!o.packageHandedOver) {
            list.push({
              id: `merchant-driver-enroute-${o.id}`,
              title: `Livreur Yango en route ! (#${o.id})`,
              message: "Le client a envoyé son livreur. Confiez-lui le colis à son arrivée.",
              time: timeAgo(o.createdAt),
              icon: "bicycle",
              color: colors.open,
              route: "/(tabs)/commandes",
            });
          } else {
            list.push({
              id: `merchant-handed-over-${o.id}`,
              title: `Colis remis au livreur (#${o.id})`,
              message: "Colis confié. Faites glisser pour clôturer dès réception de votre règlement.",
              time: timeAgo(o.createdAt),
              icon: "checkmark-done-circle",
              color: colors.open,
              route: "/(tabs)/commandes",
            });
          }
        });

      // Commandes terminées
      shopOrders
        .filter((o) => o.status === "completed")
        .slice(0, 10)
        .forEach((o) => {
          list.push({
            id: `merchant-completed-${o.id}`,
            title: `Commande #${o.id} terminée`,
            message: `Paiement perçu et commande pour ${o.customerName || "le client"} finalisée.`,
            time: timeAgo(o.createdAt),
            icon: "checkmark-circle",
            color: colors.open,
            route: "/(tabs)/commandes",
          });
        });

      // Commandes annulées
      shopOrders
        .filter((o) => o.status === "cancelled")
        .slice(0, 10)
        .forEach((o) => {
          list.push({
            id: `merchant-cancelled-${o.id}`,
            title: `Commande #${o.id} annulée`,
            message: `Le client a annulé sa commande pour ${formatPrice(o.total || o.subtotal)}.`,
            time: timeAgo(o.createdAt),
            icon: "close-circle-outline",
            color: colors.danger,
            route: "/(tabs)/commandes",
          });
        });

      // Notification informative permanente
      list.push({
        id: "merchant-welcome-guide",
        title: "Espace Commerçant actif",
        message: "Votre boutique est connectée au réseau Lafi. Vos articles sont visibles par les clients à proximité.",
        time: "Toujours actif",
        icon: "storefront-outline",
        color: colors.star,
        route: "/(tabs)",
      });
    } else if (customer) {
      // Rôle Client connecté : notifications sur ses commandes
      orders.forEach((o) => {
        if (o.status === "accepted") {
          if (o.mode === "pickup") {
            list.push({
              id: `client-accepted-${o.id}`,
              title: `Commande #${o.id} acceptée !`,
              message: `La boutique « ${o.shop} » prépare vos articles. Présentez votre code secret en boutique.`,
              time: timeAgo(o.createdAt),
              icon: "storefront-outline",
              color: colors.open,
              route: `/commande/suivi/${o.id}`,
            });
          } else if (!o.driverDispatched) {
            list.push({
              id: `client-accepted-yango-${o.id}`,
              title: `Commande #${o.id} acceptée !`,
              message: `La boutique « ${o.shop} » a validé. Vous pouvez maintenant commander votre livreur Yango.`,
              time: timeAgo(o.createdAt),
              icon: "checkmark-circle-outline",
              color: colors.open,
              route: `/commande/suivi/${o.id}`,
            });
          } else if (!o.packageHandedOver) {
            list.push({
              id: `client-driver-dispatched-${o.id}`,
              title: `Livreur en route vers la boutique (#${o.id})`,
              message: `Le commerçant prépare votre colis pour le confier au livreur.`,
              time: timeAgo(o.createdAt),
              icon: "bicycle",
              color: colors.primary,
              route: `/commande/suivi/${o.id}`,
            });
          } else {
            list.push({
              id: `client-package-handed-${o.id}`,
              title: `Colis remis au livreur Yango ! (#${o.id})`,
              message: `Le commerçant a confié vos articles au livreur. La livraison est en cours vers votre adresse.`,
              time: timeAgo(o.createdAt),
              icon: "cube",
              color: colors.open,
              route: `/commande/suivi/${o.id}`,
            });
          }
        } else if (o.status === "refused") {
          list.push({
            id: `client-refused-${o.id}`,
            title: `Commande #${o.id} refusée`,
            message: `La boutique « ${o.shop || "Commerçant"} » a refusé la commande (article indisponible ou boutique occupée).`,
            time: timeAgo(o.createdAt),
            icon: "close-circle-outline",
            color: colors.danger,
            route: `/commande/suivi/${o.id}`,
          });
        } else if (o.status === "cancelled") {
          list.push({
            id: `client-cancelled-${o.id}`,
            title: `Commande #${o.id} annulée`,
            message: `Votre commande chez « ${o.shop || "Boutique"} » a bien été annulée.`,
            time: timeAgo(o.createdAt),
            icon: "close-circle-outline",
            color: colors.danger,
            route: `/commande/suivi/${o.id}`,
          });
        } else if (o.status === "pending") {
          list.push({
            id: `client-pending-${o.id}`,
            title: `Commande transmise (#${o.id})`,
            message: `En attente de réponse de la boutique « ${o.shop} ».`,
            time: timeAgo(o.createdAt),
            icon: "hourglass-outline",
            color: colors.primary,
            route: `/commande/suivi/${o.id}`,
          });
        } else if (o.status === "completed") {
          list.push({
            id: `client-completed-${o.id}`,
            title: `🎉 Commande #${o.id} terminée !`,
            message:
              o.mode === "yango"
                ? `Votre commande a été livrée avec succès par le livreur Yango.`
                : `Votre achat chez « ${o.shop} » a été retiré et réglé avec succès.`,
            time: timeAgo(o.createdAt),
            icon: "bag-check-outline",
            color: colors.open,
            route: `/commande/suivi/${o.id}`,
          });
        }
      });
    } else {
      // Mode invité / déconnecté : message de bienvenue uniquement (aucun historique privé)
      list.push({
        id: "guest-welcome",
        title: "Bienvenue sur Lafi",
        message: "Connectez-vous pour retrouver vos commandes et trouver les meilleurs produits près de chez vous.",
        time: "Conseil",
        icon: "sparkles-outline",
        color: colors.primary,
      });
    }

    return list;
  }, [merchant, customer, orders]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  const markAsRead = useCallback(
    (id: string) => {
      if (!readIds.includes(id)) {
        saveReadIds([...readIds, id]);
      }
    },
    [readIds, saveReadIds],
  );

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    saveReadIds(allIds);
  }, [notifications, saveReadIds]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, readIds };
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function NotificationsModal({ visible, onClose }: Props) {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, readIds } =
    useNotifications();

  // Dès que la modale s'ouvre pour afficher les alertes, on marque tout comme lu
  useEffect(() => {
    if (visible && notifications.length > 0) {
      markAllAsRead();
    }
  }, [visible, notifications.length, markAllAsRead]);

  function handlePressItem(item: NotificationItem) {
    markAsRead(item.id);
    onClose();
    if (item.route) {
      router.push(item.route as any);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          {/* En-tête */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.bellIconWrap}>
                <Ionicons name="notifications" size={20} color={colors.primary} />
                {unreadCount > 0 && <View style={styles.badgeDot} />}
              </View>
              <View>
                <Text style={styles.title}>Notifications</Text>
                <Text style={styles.subtitle}>
                  {unreadCount > 0
                    ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                    : "Toutes vos alertes à jour"}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <Pressable onPress={markAllAsRead} hitSlop={8}>
                  <Text style={styles.markAllRead}>Tout lire</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Liste des notifications */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="notifications-off-outline" size={32} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Aucune notification</Text>
                <Text style={styles.emptySubtitle}>
                  Vous serez prévenu ici dès qu'un changement intervient sur vos commandes.
                </Text>
              </View>
            ) : (
              notifications.map((item) => {
                const isUnread = !readIds.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.card,
                      isUnread && styles.cardUnread,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => handlePressItem(item)}
                  >
                    <View style={[styles.itemIconWrap, { backgroundColor: item.color + "18" }]}>
                      <Ionicons name={item.icon} size={20} color={item.color} />
                    </View>

                    <View style={styles.itemContent}>
                      <View style={styles.itemTopRow}>
                        <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemTime}>{item.time}</Text>
                      </View>
                      <Text style={styles.itemMessage} numberOfLines={2}>
                        {item.message}
                      </Text>
                    </View>

                    {isUnread && <View style={styles.unreadDot} />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.lg,
    maxHeight: "80%",
    ...shadows.float,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bellIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  markAllRead: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardUnread: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.85,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs,
  },
  itemTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  itemTitleUnread: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
  itemTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  itemMessage: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});

