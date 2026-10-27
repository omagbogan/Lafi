import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import QuantityStepper from "../../components/QuantityStepper";
import { SHOP_PHONES } from "../../data/articles";
import { useArticles } from "../../store/ArticlesContext";
import { useCart } from "../../store/CartContext";
import { colors, fonts, radius, spacing } from "../../theme";
import { formatDistance, formatPrice } from "../../utils/format";

export default function ArticleDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { articles } = useArticles();
  const { addItem, startNew } = useCart();
  const [qty, setQty] = useState(1);

  const article = articles.find((a) => a.id === id);

  if (!article) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.notFound}>Article introuvable.</Text>
      </SafeAreaView>
    );
  }

  function add() {
    if (!article) return;
    if (addItem(article, qty)) {
      router.push("/panier");
      return;
    }
    Alert.alert(
      "Un seul commerçant par panier",
      "Votre panier contient des articles d'une autre boutique. Voulez-vous le vider ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Vider et ajouter",
          style: "destructive",
          onPress: () => {
            startNew(article, qty);
            router.push("/panier");
          },
        },
      ],
    );
  }

  async function openWhatsApp() {
    if (!article) return;
    const phone = article.shopPhone ?? SHOP_PHONES[article.shop];
    const text = article.negotiable
      ? `Bonjour, je suis intéressé par « ${article.name} » (${formatPrice(article.price)}, à débattre) vu sur Lafi. Pouvons-nous discuter du prix ?`
      : `Bonjour, je suis intéressé par « ${article.name} » (${formatPrice(article.price)}) vu sur Lafi.`;
    try {
      await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
    } catch {
      Alert.alert("WhatsApp indisponible", "Impossible d'ouvrir WhatsApp sur cet appareil.");
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.photo}>
          {article.photoUri ? (
            <Image source={{ uri: article.photoUri }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={[styles.product, { backgroundColor: article.color }]} />
          )}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.name}>{article.name}</Text>
          <View style={styles.category}>
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(article.price)}</Text>
          {article.negotiable && (
            <View style={styles.nego}>
              <Text style={styles.negoText}>À débattre</Text>
            </View>
          )}
        </View>

        <View style={styles.shopCard}>
          <View style={styles.avatar}>
            <Ionicons name="storefront-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{article.shop}</Text>
            <Text style={styles.shopMeta}>{formatDistance(article.distanceM)} · Ouverte</Text>
          </View>
          <View style={styles.dot} />
        </View>

        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>Quantité</Text>
          <QuantityStepper value={qty} onChange={(v) => setQty(Math.max(1, v))} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={`Ajouter au panier · ${formatPrice(article.price * qty)}`} onPress={add} />
        <Button label="Discuter sur WhatsApp" icon="logo-whatsapp" variant="whatsapp" onPress={openWhatsApp} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  notFound: { fontFamily: fonts.medium, color: colors.textMuted, padding: spacing.lg },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
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
  content: { padding: spacing.lg, gap: spacing.md },
  photo: {
    height: 260,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  product: { width: 130, height: 100, borderRadius: 18 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  category: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  categoryText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  price: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary },
  nego: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  negoText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  shopCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  shopInfo: { flex: 1, gap: 2 },
  shopName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  shopMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.open },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qtyLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  footer: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.background },
});