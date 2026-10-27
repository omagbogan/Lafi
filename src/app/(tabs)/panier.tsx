import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import QuantityStepper from "../../components/QuantityStepper";
import { DELIVERY_FEE } from "../../data/articles";
import { DeliveryMode, useCart } from "../../store/CartContext";
import { colors, fonts, radius, spacing } from "../../theme";
import { formatPrice } from "../../utils/format";

type OptionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
};

function ModeOption({ icon, title, subtitle, selected, onPress }: OptionProps) {
  return (
    <Pressable style={[styles.option, selected && styles.optionOn]} onPress={onPress}>
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{subtitle}</Text>
      </View>
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
      </View>
    </Pressable>
  );
}

export default function Panier() {
  const router = useRouter();
  const { items, shop, subtotal, deliveryFee, total, mode, setMode, setQty } = useCart();

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.title}>Panier</Text>
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Votre panier est vide.</Text>
          <View style={styles.emptyButton}>
            <Button label="Explorer les articles" variant="secondary" onPress={() => router.navigate("/")} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const modes: { id: DeliveryMode; icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }[] = [
    { id: "pickup", icon: "storefront-outline", title: "Retrait en boutique", sub: "Vous passez chez le commerçant · Sans frais" },
    { id: "yango", icon: "car-outline", title: "Livraison Yango", sub: `Frais estimés : ${formatPrice(DELIVERY_FEE)}` },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Panier</Text>
        <View style={styles.shopRow}>
          <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
          <Text style={styles.shopText}>{shop}</Text>
        </View>

        {items.map(({ article, qty }) => (
          <View key={article.id} style={styles.item}>
            <View style={styles.thumb}>
              {article.photoUri ? (
                <Image source={{ uri: article.photoUri }} style={styles.thumbImage} resizeMode="contain" />
              ) : (
                <View style={[styles.thumbProduct, { backgroundColor: article.color }]} />
              )}
            </View>
            <View style={styles.flex}>
              <Text style={styles.itemName} numberOfLines={1}>{article.name}</Text>
              <Text style={styles.itemPrice}>{formatPrice(article.price)}</Text>
            </View>
            <QuantityStepper value={qty} onChange={(v) => setQty(article.id, v)} />
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total articles</Text>
          <Text style={styles.totalValue}>{formatPrice(subtotal)}</Text>
        </View>

        <Text style={styles.section}>Réception</Text>
        {modes.map((m) => (
          <ModeOption
            key={m.id}
            icon={m.icon}
            title={m.title}
            subtitle={m.sub}
            selected={mode === m.id}
            onPress={() => setMode(m.id)}
          />
        ))}

        {mode === "yango" && (
          <View style={styles.address}>
            <Ionicons name="location" size={20} color={colors.danger} />
            <View style={styles.flex}>
              <Text style={styles.optionSub}>Adresse de livraison</Text>
              <Text style={styles.optionTitle}>Riviera Palmeraie, Abidjan</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.pay}>
          Paiement à la livraison{deliveryFee > 0 ? ` · Total ${formatPrice(total)}` : ""}
        </Text>
        <Button label="Continuer" onPress={() => router.push("/commande/recapitulatif")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text, padding: 0 },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8 },
  shopText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  emptyText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
  emptyButton: { width: 220 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbProduct: { width: 34, height: 26, borderRadius: 6 },
  itemName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  itemPrice: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary, marginTop: 2 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  totalValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  section: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, marginTop: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  optionOn: { borderColor: colors.primary, borderWidth: 1.5 },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  optionSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  address: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  footer: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.background },
  pay: { textAlign: "center", fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
});