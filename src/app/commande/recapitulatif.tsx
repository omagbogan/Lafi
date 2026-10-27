import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { useCart } from "../../store/CartContext";
import { useOrders } from "../../store/OrdersContext";
import { colors, fonts, radius, spacing } from "../../theme";
import { formatPrice } from "../../utils/format";


export default function Recapitulatif() {
  const router = useRouter();
  const { items, shop, subtotal, deliveryFee, total, mode, clear } = useCart();
  const { addOrder } = useOrders();
  const [sending, setSending] = useState(false);

  if (!shop) return null;

    async function placeOrder() {
    if (sending) return;
    setSending(true);
    try {
      const id = await addOrder(items, mode);
      clear();
      router.replace({ pathname: "/commande/confirmation", params: { id } });
    } catch (error) {
      Alert.alert(
        "Commande impossible",
        error instanceof Error ? error.message : "Réessayez dans un instant.",
      );
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Récapitulatif</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Boutique</Text>
          <Text style={styles.cardValue}>{shop}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Articles ({items.length})</Text>
          {items.map(({ article, qty }) => (
            <View key={article.id} style={styles.line}>
              <Text style={styles.lineName} numberOfLines={1}>
                {article.name} × {qty}
              </Text>
              <Text style={styles.lineValue}>{formatPrice(article.price * qty)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Réception</Text>
          <Text style={styles.cardValue}>
            {mode === "yango" ? "Livraison Yango · Riviera Palmeraie" : "Retrait en boutique"}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.line}>
            <Text style={styles.lineName}>Articles</Text>
            <Text style={styles.lineValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.lineName}>{mode === "yango" ? "Livraison (estimée)" : "Retrait"}</Text>
            <Text style={styles.lineValue}>{mode === "yango" ? formatPrice(deliveryFee) : "Gratuit"}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.line}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        <View style={styles.banner}>
          <Ionicons name="cash-outline" size={20} color={colors.open} />
          <Text style={styles.bannerText}>Vous paierez à la livraison.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={sending ? "Envoi…" : "Passer la commande"} disabled={sending} onPress={placeOrder} />
        <Text style={styles.note}>Le commerçant va confirmer votre commande.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  content: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  cardValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  lineName: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  lineValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  separator: { height: 1, backgroundColor: colors.border },
  totalLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  totalValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#E7F2EE",
    borderRadius: radius.field,
    padding: spacing.md,
  },
  bannerText: { fontFamily: fonts.medium, fontSize: 14, color: colors.open },
  footer: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.background },
  note: { textAlign: "center", fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
});