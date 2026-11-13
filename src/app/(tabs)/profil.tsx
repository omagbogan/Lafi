/**
 * src/app/(tabs)/profil.tsx
 * -------------------------
 * Écran de gestion du profil utilisateur (Client & Commerçant).
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Profil Client : carte d'identité, modification en direct (EditCustomerModal), suivi de la dernière
 *   commande et composant d'historique scrollable complet avec badges d'état colorés.
 * - Espace Commerçant : carte boutique avec modification en direct (EditShopModal), bouton d'accès
 *   au tableau de bord de gestion et aux commandes reçues avec compteur dynamique d'alertes.
 * - Favoris persistants : liste des coups de cœur synchronisée avec FavoritesContext et AsyncStorage.
 * - Actualisation au glissement (Pull-to-refresh) pour recharger l'historique et les statuts à tout moment.
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import CustomerAuthModal from "../../components/CustomerAuthModal";
import EditCustomerModal from "../../components/EditCustomerModal";
import EditShopModal from "../../components/EditShopModal";
import { api, Order } from "../../services/api";
import { useArticles } from "../../store/ArticlesContext";
import { useAuth } from "../../store/AuthContext";
import { useFavorites } from "../../store/FavoritesContext";
import { useOrders } from "../../store/OrdersContext";
import { colors, fonts, radius, shadows, spacing } from "../../theme";
import { formatPrice } from "../../utils/format";
import { timeAgo } from "../../utils/time";

const orderStatusConfig: Record<
  Order["status"],
  { label: string; bg: string; color: string }
> = {
  pending: { label: "En attente", bg: "#FEF0C7", color: "#B54708" },
  accepted: { label: "En cours", bg: colors.primaryLight, color: colors.primary },
  completed: { label: "Terminée", bg: colors.openSurface, color: colors.open },
  refused: { label: "Refusée", bg: "#FEE4E2", color: colors.danger },
  expired: { label: "Expirée", bg: colors.surface, color: colors.textMuted },
  cancelled: { label: "Annulée", bg: "#FEE4E2", color: colors.danger },
};

function CustomerOrdersHistory({
  orders,
  title,
  showAll,
  onToggleShowAll,
}: {
  orders: Order[];
  title: string;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const router = useRouter();
  if (orders.length === 0) return null;

  return (
    <View style={styles.historyBox}>
      <View style={styles.historyHeaderRow}>
        <Text style={styles.historyTitle}>
          {title} ({orders.length})
        </Text>
        {orders.length > 3 && (
          <Pressable onPress={onToggleShowAll} hitSlop={8}>
            <Text style={styles.expandText}>
              {showAll ? "Réduire" : `Tout voir (${orders.length})`}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        style={[
          styles.historyScroll,
          !showAll && orders.length > 3 && styles.historyScrollLimited,
        ]}
        contentContainerStyle={styles.historyScrollContent}
      >
        {orders.map((ord) => {
          const status = orderStatusConfig[ord.status] || orderStatusConfig.pending;
          const itemsCount = ord.items.reduce((sum, i) => sum + i.qty, 0);
          return (
            <Pressable
              key={ord.id}
              style={styles.historyItem}
              onPress={() =>
                router.push({
                  pathname: "/commande/suivi/[id]",
                  params: { id: ord.id },
                })
              }
            >
              <View style={styles.flex}>
                <View style={styles.historyShopRow}>
                  <Text style={styles.historyShop}>{ord.shop}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historySub}>
                  Commande #{ord.id} · {itemsCount} article(s) · {timeAgo(ord.createdAt)}
                </Text>
              </View>
              <Text style={styles.historyPrice}>{formatPrice(ord.total || ord.subtotal)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function Profil() {
  const router = useRouter();
  const { customer, merchant, logoutCustomer, logoutMerchant } = useAuth();
  const { articles } = useArticles();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { orders, lastOrderId, refreshOrders } = useOrders();
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [editCustomerVisible, setEditCustomerVisible] = useState(false);
  const [editShopVisible, setEditShopVisible] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const favoriteArticles = articles.filter((a) => favoriteIds.includes(a.id));

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const displayOrders = useMemo(() => {
    if (!customer) return [];
    if (customerOrders.length > 0) return customerOrders;
    return orders.filter((o) => !merchant);
  }, [customer, customerOrders, orders, merchant]);

  // Si aucun client n'est connecté, réinitialiser la liste locale des commandes
  useEffect(() => {
    if (!customer) {
      setCustomerOrders([]);
    }
  }, [customer]);

  const loadCustomerOrders = useCallback(async () => {
    if (!customer?.id) return;
    setLoadingOrders(true);
    try {
      const list = await api.getCustomerOrders(customer.id);
      setCustomerOrders(list);
    } catch {
      // silencieux
    } finally {
      setLoadingOrders(false);
    }
  }, [customer?.id]);

  const onPullToRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshOrders();
    if (customer?.id) {
      await loadCustomerOrders();
    }
    setRefreshing(false);
  }, [customer?.id, loadCustomerOrders, refreshOrders]);

  useFocusEffect(
    useCallback(() => {
      refreshOrders();
      if (customer?.id) {
        loadCustomerOrders();
      }
    }, [refreshOrders, customer?.id, loadCustomerOrders]),
  );

  function confirmLogoutCustomer() {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter de votre compte client ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: () => {
          setCustomerOrders([]);
          logoutCustomer();
        },
      },
    ]);
  }

  function confirmLogoutMerchant() {
    Alert.alert("Déconnexion boutique", "Voulez-vous déconnecter cette boutique de cet appareil ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: () => logoutMerchant(),
      },
    ]);
  }

  const isGuest = !customer && !merchant;
  const showClient = customer !== null || isGuest;
  const showMerchant = merchant !== null || isGuest;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullToRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.screenTitle}>
          {merchant ? "Mon Compte Commerçant" : "Mon Profil"}
        </Text>

        {/* ================= SECTION CLIENT ================= */}
        {showClient && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Espace Client</Text>
            </View>

            {customer ? (
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.userName}>{customer.name}</Text>
                    <Text style={styles.userPhone}>
                      {customer.phone}{customer.email ? ` · ${customer.email}` : ""}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.editPill}
                    onPress={() => setEditCustomerVisible(true)}
                  >
                    <Text style={styles.editPillText}>Modifier</Text>
                  </Pressable>
                </View>

                <View style={styles.addressBox}>
                  <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {customer.address}
                  </Text>
                </View>

                {lastOrderId && (
                  <Button
                    label="Suivre ma dernière commande"
                    icon="receipt-outline"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: "/commande/suivi/[id]",
                        params: { id: lastOrderId },
                      })
                    }
                  />
                )}

                <CustomerOrdersHistory
                  orders={displayOrders}
                  title="Historique de vos commandes"
                  showAll={showAllOrders}
                  onToggleShowAll={() => setShowAllOrders((prev) => !prev)}
                />

                <Pressable style={styles.logoutBtn} onPress={confirmLogoutCustomer}>
                  <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                  <Text style={styles.logoutText}>Se déconnecter du compte client</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.guestCard}>
                <View style={styles.guestIconRow}>
                  <View style={styles.guestIconCircle}>
                    <Ionicons name="person-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.guestCardTitle}>Mode Invité</Text>
                    <Text style={styles.guestCardSub}>
                      Inscrivez-vous pour utiliser l'assistant IA et passer vos commandes en 1 clic.
                    </Text>
                  </View>
                </View>
                <Button
                  label="S'inscrire / Se connecter"
                  onPress={() => setAuthModalVisible(true)}
                />
              </View>
            )}

            {/* Section Mes Coups de Cœur (Favoris persistants) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Mes Coups de Cœur ({favoriteArticles.length})
              </Text>
            </View>
            <View style={styles.card}>
              {favoriteArticles.length > 0 ? (
                favoriteArticles.map((art) => (
                  <Pressable
                    key={art.id}
                    style={styles.historyItem}
                    onPress={() =>
                      router.push({
                        pathname: "/article/[id]",
                        params: { id: art.id },
                      })
                    }
                  >
                    <View style={[styles.favColorDot, { backgroundColor: art.color }]} />
                    <View style={styles.flex}>
                      <Text style={styles.historyShop} numberOfLines={1}>
                        {art.name}
                      </Text>
                      <Text style={styles.historySub}>
                        {art.shop} · {formatPrice(art.price)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => toggleFavorite(art.id)}
                      hitSlop={8}
                      accessibilityLabel="Retirer des favoris"
                    >
                      <Ionicons name="heart" size={18} color={colors.danger} />
                    </Pressable>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyFavText}>
                  Aucun favori pour l'instant. Touchez le cœur sur un article pour le retrouver ici !
                </Text>
              )}
            </View>
          </>
        )}

        {/* ================= SECTION COMMERÇANT ================= */}
        {showMerchant && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Espace Commerçant</Text>
            </View>

            {merchant ? (
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.merchantIconCircle}>
                    <Ionicons name="storefront" size={24} color={colors.open} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.userName}>{merchant.shopName}</Text>
                    <Text style={styles.userPhone}>
                      Gérant : {merchant.ownerName} · {merchant.phone}
                      {merchant.email ? ` · ${merchant.email}` : ""}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.editPill}
                    onPress={() => setEditShopVisible(true)}
                  >
                    <Text style={styles.editPillText}>Modifier</Text>
                  </Pressable>
                </View>

                {merchant.address && (
                  <View style={styles.addressBox}>
                    <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.addressText}>{merchant.address}</Text>
                  </View>
                )}

                <View style={styles.merchantActions}>
                  <Button
                    label="Gérer ma boutique & articles"
                    icon="storefront-outline"
                    variant="primary"
                    onPress={() => router.push("/commercant/boutique")}
                  />
                  <Button
                    label={
                      pendingCount > 0
                        ? `Commandes reçues (${pendingCount} nouvelle${pendingCount > 1 ? "s" : ""})`
                        : "Commandes reçues"
                    }
                    icon="notifications-outline"
                    variant="secondary"
                    onPress={() => router.push("/commercant/commandes")}
                  />
                </View>

                <Pressable style={styles.logoutBtn} onPress={confirmLogoutMerchant}>
                  <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                  <Text style={styles.logoutText}>Déconnecter ma boutique</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.guestCard}>
                <View style={styles.guestIconRow}>
                  <View style={styles.merchantIconCircle}>
                    <Ionicons name="storefront-outline" size={24} color={colors.open} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.guestCardTitle}>Vous vendez des produits ?</Text>
                    <Text style={styles.guestCardSub}>
                      Ouvrez votre boutique sur Lafi et recevez directement les commandes des clients de votre commune.
                    </Text>
                  </View>
                </View>
                <Button
                  label="Créer ou ouvrir ma boutique"
                  icon="storefront-outline"
                  variant="secondary"
                  onPress={() => router.push("/commercant/inscription")}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <CustomerAuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={() => {
          setAuthModalVisible(false);
          loadCustomerOrders();
        }}
        title="Compte Client"
        subtitle="Renseignez vos informations de livraison et contact."
      />

      <EditCustomerModal
        visible={editCustomerVisible}
        onClose={() => setEditCustomerVisible(false)}
        onSuccess={() => {
          setEditCustomerVisible(false);
          loadCustomerOrders();
        }}
      />

      <EditShopModal
        visible={editShopVisible}
        onClose={() => setEditShopVisible(false)}
        onSuccess={() => setEditShopVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  screenTitle: { fontFamily: fonts.bold, fontSize: 26, color: colors.text },
  sectionHeader: { marginTop: spacing.md, marginBottom: 2 },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  merchantIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.openSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  favColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  emptyFavText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
  userName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  userPhone: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  editPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  editPillText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    padding: spacing.sm,
  },
  addressText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  historyBox: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  historyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  historyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  expandText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  historyScroll: {
    width: "100%",
  },
  historyScrollLimited: {
    maxHeight: 250,
  },
  historyScrollContent: {
    gap: spacing.xs,
    paddingRight: 2,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    gap: spacing.sm,
  },
  historyShopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyShop: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 10,
  },
  historySub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyPrice: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primary,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  guestCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  guestIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  guestIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  guestCardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  guestCardSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  merchantActions: {
    gap: spacing.sm,
  },
  flex: { flex: 1 },
});
