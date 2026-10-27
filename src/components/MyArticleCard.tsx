import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Article } from "../data/articles";
import { colors, fonts, radius } from "../theme";
import { formatPrice } from "../utils/format";

type Props = {
  article: Article;
  onEdit: () => void;
  onToggleHidden: () => void;
};

export default function MyArticleCard({ article, onEdit, onToggleHidden }: Props) {
  const dimmed = article.hidden || article.outOfStock;
  const tag = article.outOfStock ? "Rupture" : article.hidden ? "Masqué" : null;

  return (
    <View style={styles.card}>
      <View style={styles.photo}>
        <View style={[styles.photoInner, dimmed && styles.dimmed]}>
          {article.photoUri ? (
            <Image source={{ uri: article.photoUri }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={[styles.product, { backgroundColor: article.color }]} />
          )}
        </View>
        {tag && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.name, dimmed && styles.nameDimmed]} numberOfLines={1}>
        {article.name}
      </Text>

      <View style={styles.bottom}>
        <Pressable style={styles.priceChip} onPress={onEdit}>
          <Text style={styles.price}>{formatPrice(article.price)}</Text>
          <Ionicons name="pencil" size={11} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.eye} onPress={onToggleHidden}>
          <Ionicons
            name={article.hidden ? "eye-off-outline" : "eye-outline"}
            size={16}
            color={article.hidden ? colors.textMuted : colors.text}
          />
        </Pressable>
      </View>
    </View>
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
    gap: 8,
  },
  photo: { height: 110 },
  photoInner: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dimmed: { opacity: 0.45 },
  image: { width: "100%", height: "100%" },
  product: { width: 60, height: 44, borderRadius: 10 },
  tag: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagText: { fontFamily: fonts.semibold, fontSize: 10, color: "#FFFFFF" },
  name: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  nameDimmed: { color: colors.textMuted },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  price: { fontFamily: fonts.bold, fontSize: 12, color: colors.text },
  eye: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});