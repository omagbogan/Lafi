import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Article } from "../data/articles";
import { useCart } from "../store/CartContext";
import { useFavorites } from "../store/FavoritesContext";
import { colors, fonts, radius, shadows } from "../theme";
import { formatDistance, formatPrice } from "../utils/format";

type Props = {
  article: Article;
  onPress?: () => void;
};

export default function ArticleCard({ article, onPress }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { items, addItem, startNew } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const favorite = isFavorite(article.id);
  const cartItem = items.find((i) => i.article.id === article.id);
  const inCartQty = cartItem?.qty ?? 0;

  const handleAddToCart = () => {
    if (article.outOfStock) {
      Alert.alert("Rupture de stock", "Cet article est temporairement indisponible.");
      return;
    }

    const success = addItem(article, 1);
    if (success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
    } else {
      Alert.alert(
        "Un seul commerçant par panier",
        `Votre panier contient déjà des articles d'une autre boutique. Souhaitez-vous le vider pour ajouter « ${article.name} » ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Vider et ajouter",
            style: "destructive",
            onPress: () => {
              startNew(article, 1);
              setJustAdded(true);
              setTimeout(() => setJustAdded(false), 1200);
            },
          },
        ],
      );
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.photoContainer}>
        {article.photoUri ? (
          <Image source={{ uri: article.photoUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.productPlaceholder, { backgroundColor: article.color }]} />
        )}

        <Pressable
          style={({ pressed }) => [styles.heartBtn, pressed && styles.heartBtnPressed]}
          onPress={() => toggleFavorite(article.id)}
          hitSlop={6}
          accessibilityLabel="Ajouter aux favoris"
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={18}
            color={favorite ? colors.danger : colors.textMuted}
          />
        </Pressable>
      </View>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {article.name}
        </Text>

        <View style={styles.shopRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.shop} numberOfLines={1}>
            {article.shop} · {formatDistance(article.distanceM)}
          </Text>
        </View>

        <View style={styles.bottom}>
          <View style={styles.priceColumn}>
            <Text style={styles.price}>{formatPrice(article.price)}</Text>
            {article.negotiable && <Text style={styles.nego}>À débattre</Text>}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              justAdded && styles.addBtnSuccess,
              pressed && styles.addBtnPressed,
            ]}
            onPress={handleAddToCart}
            hitSlop={8}
            accessibilityLabel="Ajouter directement au panier"
          >
            <Ionicons
              name={justAdded ? "checkmark" : "add"}
              size={18}
              color="#FFFFFF"
            />
            {inCartQty > 0 && !justAdded && (
              <View style={styles.inCartBadge}>
                <Text style={styles.inCartBadgeText}>{inCartQty}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 8,
    ...shadows.card,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  photoContainer: {
    height: 125,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  productPlaceholder: {
    width: 64,
    height: 48,
    borderRadius: 12,
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  heartBtnPressed: {
    transform: [{ scale: 0.9 }],
  },
  details: {
    gap: 4,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shop: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  priceColumn: {
    justifyContent: "center",
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  nego: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.primary,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...shadows.button,
  },
  addBtnSuccess: {
    backgroundColor: colors.open,
  },
  addBtnPressed: {
    transform: [{ scale: 0.88 }],
    opacity: 0.85,
  },
  inCartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: colors.open,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  inCartBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: "#FFFFFF",
    lineHeight: 11,
    includeFontPadding: false,
  },
});
