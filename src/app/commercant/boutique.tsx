import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EditArticleSheet from "../../components/EditArticleSheet";
import MyArticleCard from "../../components/MyArticleCard";
import { Article, MY_SHOP } from "../../data/articles";
import { useArticles } from "../../store/ArticlesContext";
import { colors, fonts, radius, spacing } from "../../theme";
import { EMPTY_ID, padToEven } from "../../utils/grid";

const SHOP_LINK = "lafi.app/aicha";

export default function Boutique() {
  const router = useRouter();
  const { myArticles, shopOpen, setShopOpen, updateArticle } = useArticles();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);

  async function copyLink() {
    await Clipboard.setStringAsync(`https://${SHOP_LINK}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.titleBlock}>
        <Text style={styles.shopName}>{MY_SHOP}</Text>
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.loc}>Marché de Cocody · position enregistrée</Text>
        </View>
      </View>

      <View style={styles.segment}>
        <Pressable
          style={[styles.seg, shopOpen && styles.segOpen]}
          onPress={() => setShopOpen(true)}
        >
          <Text style={[styles.segText, shopOpen && styles.segTextOn]}>Ouverte</Text>
        </Pressable>
        <Pressable
          style={[styles.seg, !shopOpen && styles.segClosed]}
          onPress={() => setShopOpen(false)}
        >
          <Text style={[styles.segText, !shopOpen && styles.segTextOn]}>Fermée</Text>
        </Pressable>
      </View>

      {!shopOpen && (
        <Text style={styles.warning}>
          Votre boutique n'apparaît plus dans les résultats des clients.
        </Text>
      )}

      <View style={styles.linkCard}>
        <Ionicons name="link-outline" size={18} color={colors.text} />
        <Text style={styles.link} numberOfLines={1}>
          {SHOP_LINK}
        </Text>
        <Pressable style={styles.copy} onPress={copyLink}>
          <Text style={styles.copyText}>{copied ? "Copié ✓" : "Copier"}</Text>
        </Pressable>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Mes articles · {myArticles.length}</Text>
        <Pressable style={styles.add} onPress={() => router.push("/commercant/nouvel-article")}>
          <Ionicons name="add" size={14} color={colors.text} />
          <Text style={styles.addText}>Ajouter</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Ma boutique</Text>
        <View style={styles.back} />
      </View>

      <FlatList
        data={padToEven(myArticles)}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={styles.empty}>Aucun article pour le moment.</Text>}
        renderItem={({ item }) =>
          item.id === EMPTY_ID ? (
            <View style={{ flex: 1 }} />
          ) : (
            <MyArticleCard
              article={item}
              onEdit={() => setEditing(item)}
              onToggleHidden={() => updateArticle(item.id, { hidden: !item.hidden })}
            />
          )
        }
      />

      <EditArticleSheet
        article={editing}
        onClose={() => setEditing(null)}
        onSave={(changes) => {
          if (editing) updateArticle(editing.id, changes);
          setEditing(null);
        }}
      />
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
  list: { padding: spacing.lg, gap: spacing.md },
  row: { gap: spacing.md },
  headerContent: { gap: spacing.md, marginBottom: spacing.sm },
  titleBlock: { gap: spacing.xs },
  shopName: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  loc: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    padding: 4,
    gap: 4,
  },
  seg: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12 },
  segOpen: { backgroundColor: colors.open },
  segClosed: { backgroundColor: colors.textMuted },
  segText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
  segTextOn: { fontFamily: fonts.semibold, color: "#FFFFFF" },
  warning: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
  },
  link: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  copy: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyText: { fontFamily: fonts.semibold, fontSize: 13, color: "#FFFFFF" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  section: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  add: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  empty: {
    textAlign: "center",
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});