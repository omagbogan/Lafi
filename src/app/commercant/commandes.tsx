import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import Chip from "../../components/Chip";
import { MY_SHOP } from "../../data/articles";
import { Order, useOrders } from "../../store/OrdersContext";
import { colors, fonts, radius, spacing } from "../../theme";
import { formatPrice } from "../../utils/format";
import { timeAgo } from "../../utils/time";
import { useNow } from "../../utils/useNow";


const statusLabel: Record<Order["status"], string> = {
  pending: "En attente",
  accepted: "Acceptée",
  refused: "Refusée",
  expired: "Expirée",
};

type CardProps = { order: Order; onAccept: () => void; onRefuse: () => void };

function OrderCard({ order, onAccept, onRefuse }: CardProps) {
  const pending = order.status === "pending";
  const accepted = order.status === "accepted";

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.time}>{timeAgo(order.createdAt)}</Text>
        {!pending && (
          <View style={[styles.tag, accepted && styles.tagOk]}>
            <Text style={[styles.tagText, accepted && styles.tagTextOk]}>
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

      <View style={styles.modeRow}>
        <Ionicons
          name={order.mode === "yango" ? "car-outline" : "storefront-outline"}
          size={16}
          color={colors.textMuted}
        />
        <Text style={styles.mode}>
          {order.mode === "yango" ? "Livraison Yango · Riviera Palmeraie" : "Retrait en boutique"}
        </Text>
      </View>

      <View style={styles.line}>
        <Text style={styles.totalLabel}>Total des articles</Text>
        <Text style={styles.totalValue}>{formatPrice(order.subtotal)}</Text>
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
    </View>
  );
}

export default function Commandes() {
  const router = useRouter();
    const { orders, setStatus, refreshOrders } = useOrders();

  // Actualise les commandes à l'ouverture de l'écran, puis toutes les 8 secondes
  useFocusEffect(
    useCallback(() => {
      refreshOrders();
      const timer = setInterval(refreshOrders, 8000);
      return () => clearInterval(timer);
    }, [refreshOrders]),
  );
  const [tab, setTab] = useState<"pending" | "done">("pending");
  useNow();

  const mine = orders.filter((o) => o.shop === MY_SHOP);
  const pendingCount = mine.filter((o) => o.status === "pending").length;
  const data = mine.filter((o) => (tab === "pending" ? o.status === "pending" : o.status !== "pending"));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Commandes</Text>
        <View style={styles.counter}>
          <Text style={styles.counterText}>{pendingCount}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <Chip label="En attente" active={tab === "pending"} onPress={() => setTab("pending")} />
        <Chip label="Traitées" active={tab === "done"} onPress={() => setTab("done")} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === "pending" ? "Aucune commande en attente." : "Aucune commande traitée."}
          </Text>
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onAccept={() => setStatus(item.id, "accepted")}
            onRefuse={() => setStatus(item.id, "refused")}
          />
        )}
      />
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
    paddingVertical: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  counter: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  counterText: { fontFamily: fonts.bold, fontSize: 13, color: "#FFFFFF" },
  tabs: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { textAlign: "center", fontFamily: fonts.regular, color: colors.textMuted, marginTop: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  tag: { backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  tagOk: { backgroundColor: "#E7F2EE" },
  tagText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted },
  tagTextOk: { color: colors.open },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  lineName: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  lineValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
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
});