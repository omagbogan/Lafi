import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import QuantityStepper from "../../components/QuantityStepper";
import { SHOP_PHONES } from "../../data/articles";
import { useArticles } from "../../store/ArticlesContext";
import { useCart } from "../../store/CartContext";
import { useFavorites } from "../../store/FavoritesContext";
import { colors, fonts, radius, shadows, spacing } from "../../theme";
import { formatPrice } from "../../utils/format";

export default function ArticleDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { articles } = useArticles();
  const { addItem, startNew, count } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [qty, setQty] = useState(1);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const article = articles.find((a) => a.id === id);
  const favorite = article ? isFavorite(article.id) : false;

  const articlePhotos =
    article?.photos && article.photos.length > 0
      ? article.photos
      : article?.photoUri
        ? [article.photoUri]
        : [];
  const currentPhotoUri =
    articlePhotos[selectedPhotoIndex] || articlePhotos[0] || article?.photoUri;

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

  async function handleShare() {
    if (!article) return;
    try {
      await Share.share({
        message: `Regarde « ${article.name} » à ${formatPrice(article.price)} sur Lafi chez ${article.shop} !`,
      });
    } catch {
      // Ignoré
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>

        <View style={styles.topRightActions}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
            onPress={() => toggleFavorite(article.id)}
            hitSlop={8}
            accessibilityLabel="Favoris"
          >
            <Ionicons
              name={favorite ? "heart" : "heart-outline"}
              size={20}
              color={favorite ? colors.danger : colors.text}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
            onPress={handleShare}
            hitSlop={8}
            accessibilityLabel="Partager"
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
            onPress={() => router.push("/panier")}
            hitSlop={8}
            accessibilityLabel="Panier"
          >
            <Ionicons name="cart-outline" size={20} color={colors.text} />
            {count > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{count}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Photo Gallery */}
        <View style={styles.photoContainer}>
          {currentPhotoUri ? (
            <Image
              source={{ uri: currentPhotoUri }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.productPlaceholder, { backgroundColor: article.color }]} />
          )}
        </View>

        {/* Thumbnail Selector Row */}
        {articlePhotos.length > 1 && (
          <View style={styles.thumbnailsRow}>
            {articlePhotos.map((pUri, idx) => (
              <Pressable
                key={idx}
                style={[
                  styles.thumbnail,
                  selectedPhotoIndex === idx && styles.thumbnailActive,
                ]}
                onPress={() => setSelectedPhotoIndex(idx)}
              >
                <Image
                  source={{ uri: pUri }}
                  style={styles.thumbImage}
                  resizeMode="contain"
                />
              </Pressable>
            ))}
          </View>
        )}

        {/* Product Title & Merchant Info */}
        <View style={styles.titleSection}>
          <Text style={styles.name}>{article.name}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.shopName}>Par {article.shop}</Text>
          </View>

          {article.description ? (
            <Text style={styles.descriptionText}>{article.description}</Text>
          ) : null}
        </View>

        {/* Price & Stepper Row */}
        <View style={styles.priceStepperRow}>
          <View>
            <Text style={styles.price}>{formatPrice(article.price)}</Text>
            {article.negotiable && (
              <Text style={styles.negotiableNote}>Prix indicatif · À débattre</Text>
            )}
          </View>
          <QuantityStepper value={qty} onChange={(v) => setQty(Math.max(1, v))} />
        </View>

        {/* Option Pills (Couleur / Catégorie) */}
        <View style={styles.optionsSection}>
          <Text style={styles.optionsTitle}>Catégorie</Text>
          <View style={styles.pillsRow}>
            <View style={[styles.pillOption, styles.pillOptionActive]}>
              <Text style={styles.pillTextActive}>{article.category}</Text>
            </View>
            {article.negotiable && (
              <View style={styles.pillOption}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
                <Text style={styles.pillTextPrimary}>Négociable</Text>
              </View>
            )}
          </View>
        </View>

        {/* Snapshot View (Aperçu rapide) */}
        <View style={styles.snapshotSection}>
          <Text style={styles.optionsTitle}>Aperçu rapide</Text>

          <View style={styles.snapshotCard}>
            <View style={styles.snapshotItem}>
              <View style={styles.snapshotIconWrap}>
                <Ionicons name="storefront-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.snapshotTextGroup}>
                <Text style={styles.snapshotItemTitle}>Retrait direct en boutique</Text>
                <Text style={styles.snapshotItemSub}>
                  Disponible immédiatement à {article.shop}
                </Text>
              </View>
            </View>

            <View style={styles.snapshotDivider} />

            <View style={styles.snapshotItem}>
              <View style={styles.snapshotIconWrap}>
                <Ionicons name="car-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.snapshotTextGroup}>
                <Text style={styles.snapshotItemTitle}>Livraison rapide Yango</Text>
                <Text style={styles.snapshotItemSub}>Trouvez facilement un livreur sur Yango</Text>
              </View>
            </View>

            <View style={styles.snapshotDivider} />

            <View style={styles.snapshotItem}>
              <View style={styles.snapshotIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.open} />
              </View>
              <View style={styles.snapshotTextGroup}>
                <Text style={styles.snapshotItemTitle}>Commerçant vérifié Lafi</Text>
                <Text style={styles.snapshotItemSub}>Paiement sécurisé ou à la livraison</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Dual Action Buttons at the Bottom */}
      <View style={styles.footer}>
        <View style={styles.footerDualRow}>
          <View style={styles.footerBtnLeft}>
            <Button
              label="Négocier"
              icon="logo-whatsapp"
              variant="whatsapp"
              onPress={openWhatsApp}
            />
          </View>
          <View style={styles.footerBtnRight}>
            <Button
              label="Ajouter au panier"
              icon="cart"
              variant="primary"
              onPress={add}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notFound: {
    fontFamily: fonts.medium,
    color: colors.textMuted,
    padding: spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...shadows.card,
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.8,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#FFFFFF",
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  photoContainer: {
    height: 250,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    ...shadows.card,
  },
  image: {
    width: "85%",
    height: "85%",
  },
  productPlaceholder: {
    width: 140,
    height: 110,
    borderRadius: 20,
  },
  thumbnailsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnailActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  thumbImage: {
    width: "80%",
    height: "80%",
  },
  thumbPlaceholder: {
    width: 34,
    height: 26,
    borderRadius: 6,
  },
  titleSection: {
    gap: 4,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  shopName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  descriptionText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginTop: 6,
  },
  priceStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
  negotiableNote: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  optionsSection: {
    gap: 8,
  },
  optionsTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  pillOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  pillTextActive: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  pillTextPrimary: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  snapshotSection: {
    gap: 8,
  },
  snapshotCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  snapshotItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  snapshotIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  snapshotTextGroup: {
    flex: 1,
    gap: 2,
  },
  snapshotItemTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  snapshotItemSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  snapshotDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.float,
  },
  footerDualRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  footerBtnLeft: {
    flex: 1,
  },
  footerBtnRight: {
    flex: 1.6,
  },
});
