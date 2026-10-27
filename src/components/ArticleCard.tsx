import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Article } from "../data/articles";
import { colors, fonts, radius } from "../theme";
import { formatDistance, formatPrice } from "../utils/format";



type Props = {
  article: Article;
  onPress?: () => void;
};

export default function ArticleCard({ article, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.photo}>
        {article.photoUri ? (
          <Image source={{ uri: article.photoUri }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={[styles.product, { backgroundColor: article.color }]} />
        )}
        {article.open && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Ouverte</Text>
          </View>
        )}
      </View>

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
        <View>
          <Text style={styles.price}>{formatPrice(article.price)}</Text>
          {article.negotiable && <Text style={styles.nego}>À débattre</Text>}
        </View>
        <View style={styles.add}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
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
    padding: 8,
    gap: 6,
  },
  photo: {
    height: 120,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  product: { width: 64, height: 48, borderRadius: 10 },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#E7F2EE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.open },
  name: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, marginTop: 2 },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  shop: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, flex: 1 },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  add: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

image: { width: "100%",
        height: "100%",
        borderRadius: 14 
        },

nego: { fontFamily: fonts.medium,
        fontSize: 10, 
        color: colors.textMuted 
    },
});