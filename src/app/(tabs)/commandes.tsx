import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import Chip from "../../components/Chip";
import SwipeButton from "../../components/SwipeButton";
import { useAuth } from "../../store/AuthContext";
import { Order, useOrders } from "../../store/OrdersContext";
import { colors, fonts, radius, shadows, spacing } from "../../theme";
import { formatPrice } from "../../utils/format";
import { timeAgo } from "../../utils/time";
import { useNow } from "../../utils/useNow";

const statusLabel: Record<Order["status"], string> = {
  pending: "En attente",
  accepted: "En cours",
  completed: "Terminée",
  refused: "Refusée",
  expired: "Expirée",
  cancelled: "Annulée",
};

type CardProps = {
  order: Order;
  onAccept: () => void;
  onRefuse: () => void;
  onValidatePickup: () => void;
  onHandoverPackage: () => void;
  onCompleteYango: () => void;
};

function OrderCard({
  order,
  onAccept,
  onRefuse,
  onValidatePickup,
  onHandoverPackage,
  onCompleteYango,
}: CardProps) {
  const pending = order.status === "pending";
  const accepted = order.status === "accepted";
  const completed = order.status === "completed";

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.time}>{timeAgo(order.createdAt)}</Text>
        {!pending && (
          <View
            style={[
              styles.tag,
              (accepted || completed) && styles.tagOk,
              (order.status === "refused" || order.status === "cancelled") && styles.tagDanger,
            ]}
          >
            <Text
              style={[
                styles.tagText,
                (accepted || completed) && styles.tagTextOk,
                (order.status === "refused" || order.status === "cancelled") && styles.tagTextDanger,
              ]}
            >
              {statusLabel[order.status]}
            </Text>
          </View>
        )}
      </View>

      {order.items.map(({ article, qty }) => (
        <View key={article.id} style={styles.line}>
          <Text style={styles.lineName} numberOfLines={1}>
            {article.name} × {qty}
          </Text>
          <Text style={styles.lineValue}>{formatPrice(article.price * qty)}</Text>
        </View>
      ))}

      {/* Informations Client */}
      {order.customerName && (
        <View style={styles.customerBox}>
          <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.customerName}>{order.customerName}</Text>
          {order.customerPhone && (
            <Text style={styles.customerPhone}>· {order.customerPhone}</Text>
          )}
        </View>
      )}

      <View style={styles.modeRow}>
        <Ionicons
          name={order.mode === "yango" ? "car-outline" : "storefront-outline"}
          size={16}
          color={colors.textMuted}
        />
        <Text style={styles.mode}>
          {order.mode === "yango"
            ? `Livraison Yango · ${order.customerAddress || "Abidjan"}`
            : "Retrait en boutique"}
        </Text>
      </View>

      <View style={styles.line}>
        <Text style={styles.totalLabel}>Total de la commande</Text>
        <Text style={styles.totalValue}>{formatPrice(order.total || order.subtotal)}</Text>
      </View>

      {pending && (
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label="Accepter" onPress={onAccept} />
          </View>
          <Pressable style={styles.refuse} onPress={onRefuse}>
            <Text style={styles.refuseText}>Refuser</Text>
          </Pressable>
        </View>
      )}

      {accepted && (
        <View style={styles.actions}>
          {order.mode === "pickup" ? (
            <View style={styles.flex}>
              <Button
                label="Valider le retrait (Code client)"
                icon="key-outline"
                onPress={onValidatePickup}
              />
            </View>
          ) : !order.driverDispatched ? (
            <View style={styles.waitingDriverBox}>
              <View style={styles.waitingDriverHeader}>
                <Ionicons name="time-outline" size={18} color={colors.star} />
                <Text style={styles.waitingDriverTitle}>En attente de commande du livreur</Text>
              </View>
              <Text style={styles.waitingDriverSub}>
                Le client est en train de commander sa course sur Yango. Dès qu'il aura confirmé l'envoi du livreur, vous pourrez lui remettre le colis.
              </Text>
            </View>
          ) : !order.packageHandedOver ? (
            <View style={styles.dispatchSection}>
              <View style={styles.driverEnRouteBox}>
                <Ionicons name="bicycle" size={18} color={colors.open} />
                <View style={styles.flex}>
                  <Text style={styles.driverEnRouteTitle}>Livreur Yango en route !</Text>
                  <Text style={styles.driverEnRouteSub}>
                    Le client a confirmé l'envoi de son livreur. Confiez-lui le colis à son arrivée puis cliquez sur « Marquer comme remis ».
                  </Text>
                </View>
              </View>
              <Button
                label="Marquer comme remis au livreur"
                icon="cube-outline"
                onPress={onHandoverPackage}
              />
            </View>
          ) : (
            <View style={styles.dispatchSection}>
              <View style={styles.handedOverBox}>
                <Ionicons name="checkmark-done-circle" size={18} color={colors.open} />
                <View style={styles.flex}>
                  <Text style={styles.handedOverTitle}>Colis remis au livreur</Text>
                  <Text style={styles.handedOverSub}>
                    Le colis a été confié. Dès réception de votre règlement, faites glisser pour clôturer la commande.
                  </Text>
                </View>
              </View>
              <SwipeButton
                label="Glisser pour valider la commande"
                completedLabel="Commande terminée & payée !"
                variant="success"
                icon="checkmark"
                onSwipeComplete={onCompleteYango}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function CommandesTab() {
  const router = useRouter();
  const { merchant } = useAuth();
  const { orders, setStatus, validatePickup, handoverPackage, refreshOrders } = useOrders();
  const [tab, setTab] = useState<"pending" | "accepted" | "done" | "all">("pending");
  const [refreshing, setRefreshing] = useState(false);
  const [pickupModalOrder, setPickupModalOrder] = useState<Order | null>(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [validating, setValidating] = useState(false);
  useNow();

  // Protection : si aucun commerçant n'est connecté, rediriger
  useEffect(() => {
    if (!merchant) {
      router.replace("/(tabs)");
    }
  }, [merchant, router]);

  // Actualise les commandes à l'ouverture de l'écran, puis toutes les 8 secondes
  useFocusEffect(
    useCallback(() => {
      refreshOrders();
      const timer = setInterval(refreshOrders, 8000);
      return () => clearInterval(timer);
    }, [refreshOrders]),
  );

  async function onPullToRefresh() {
    setRefreshing(true);
    await refreshOrders();
    setRefreshing(false);
  }

  async function handleConfirmPickup() {
    if (!pickupModalOrder || enteredCode.trim().length !== 4) return;
    setValidating(true);
    const success = await validatePickup(pickupModalOrder.id, enteredCode.trim());
    setValidating(false);
    if (success) {
      setPickupModalOrder(null);
      setEnteredCode("");
      Alert.alert("Retrait validé !", "La commande est officiellement clôturée.");
    }
  }

  async function handleHandoverPackage(order: Order) {
    const success = await handoverPackage(order.id);
    if (success) {
      Alert.alert(
        "Colis remis !",
        `La commande #${order.id} a été marquée comme confiée au livreur. Vous pouvez maintenant la finaliser dès réception de votre paiement.`,
      );
    }
  }

  async function handleCompleteYango(order: Order) {
    await setStatus(order.id, "completed");
    Alert.alert("Commande terminée !", `La commande #${order.id} a été remise au livreur et validée.`);
  }

  if (!merchant) {
    return null;
  }

  // Filtrer les commandes pour la boutique actuelle
  const currentShopName = merchant.shopName;
  const mine = currentShopName
    ? orders.filter((o) => !o.shop || o.shop === currentShopName)
    : orders;

  const pendingCount = mine.filter((o) => o.status === "pending").length;
  const acceptedCount = mine.filter((o) => o.status === "accepted").length;

  const data = mine.filter((o) => {
    if (tab === "pending") return o.status === "pending";
    if (tab === "accepted") return o.status === "accepted";
    if (tab === "done") return o.status === "completed" || o.status === "refused" || o.status === "cancelled";
    return true;
  });

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <View style={styles.titleWithBadge}>
          <Text style={styles.topTitle}>Commandes reçues</Text>
          {pendingCount > 0 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <Pressable
          style={styles.refreshIconBtn}
          onPress={onPullToRefresh}
          hitSlop={8}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Chip
          label={`En attente (${pendingCount})`}
          active={tab === "pending"}
          onPress={() => setTab("pending")}
        />
        <Chip
          label={`En cours (${acceptedCount})`}
          active={tab === "accepted"}
          onPress={() => setTab("accepted")}
        />
        <Chip
          label="Terminées"
          active={tab === "done"}
          onPress={() => setTab("done")}
        />
        <Chip
          label="Toutes"
          active={tab === "all"}
          onPress={() => setTab("all")}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullToRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {tab === "pending"
                ? "Aucune commande en attente"
                : tab === "accepted"
                  ? "Aucune commande en cours"
                  : "Aucune commande trouvée"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {tab === "pending"
                ? "Les commandes passées par vos clients apparaîtront ici en direct."
                : tab === "accepted"
                  ? "Les commandes acceptées en attente de retrait client ou livreur s'affichent ici."
                  : "Vos commandes traitées apparaîtront dans cette liste."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onAccept={() => setStatus(item.id, "accepted")}
            onRefuse={() => setStatus(item.id, "refused")}
            onValidatePickup={() => {
              setPickupModalOrder(item);
              setEnteredCode("");
            }}
            onHandoverPackage={() => handleHandoverPackage(item)}
            onCompleteYango={() => handleCompleteYango(item)}
          />
        )}
      />

      {/* Modal de validation du code secret de retrait */}
      <Modal
        visible={pickupModalOrder !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickupModalOrder(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="key" size={24} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Validation du retrait</Text>
              <Text style={styles.modalSub}>
                Saisissez le code secret à 4 chiffres affiché sur l'application du client après réception de votre paiement.
              </Text>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 4821"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              value={enteredCode}
              onChangeText={setEnteredCode}
              autoFocus
            />

            <View style={styles.modalActions}>
              <Button
                label={validating ? "Vérification…" : "Confirmer la remise"}
                icon="checkmark-circle"
                disabled={enteredCode.trim().length !== 4 || validating}
                onPress={handleConfirmPickup}
              />
              <Button
                label="Annuler"
                variant="secondary"
                disabled={validating}
                onPress={() => setPickupModalOrder(null)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  topTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  counter: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  counterText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#FFFFFF",
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  list: { padding: spacing.lg, gap: spacing.md },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  time: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  tag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagOk: { backgroundColor: "#E7F2EE" },
  tagDanger: { backgroundColor: "#FEE2E2" },
  tagText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
  tagTextOk: { color: colors.open },
  tagTextDanger: { color: colors.danger },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  lineName: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  lineValue: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  customerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.field,
    alignSelf: "flex-start",
  },
  customerName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  customerPhone: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mode: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  totalLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  totalValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  refuse: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  refuseText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.float,
  },
  modalHeader: {
    alignItems: "center",
    gap: spacing.xs,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: "center",
  },
  modalSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: "center",
    color: colors.text,
    paddingVertical: spacing.md,
  },
  modalActions: {
    gap: spacing.sm,
  },
  waitingDriverBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  waitingDriverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  waitingDriverTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  waitingDriverSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  dispatchSection: {
    flex: 1,
    gap: spacing.sm,
  },
  driverEnRouteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.openSurface,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.open,
    padding: spacing.sm,
  },
  driverEnRouteTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.open,
  },
  driverEnRouteSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.text,
    lineHeight: 15,
  },
  handedOverBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.openSurface,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.open,
    padding: spacing.sm,
  },
  handedOverTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.open,
  },
  handedOverSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.text,
    lineHeight: 15,
  },
});

