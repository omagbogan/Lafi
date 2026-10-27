import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArticleCard from "../../components/ArticleCard";
import Chip from "../../components/Chip";
import { categories } from "../../data/articles";
import { useArticles } from "../../store/ArticlesContext";
import { colors, fonts, radius, spacing } from "../../theme";
import { EMPTY_ID, padToEven } from "../../utils/grid";


export default function Home() {
  const router = useRouter();
    const { catalog, refresh, error } = useArticles();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const [category, setCategory] = useState("Tout");
  const [query, setQuery] = useState("");
    const { q } = useLocalSearchParams<{ q?: string }>();

  useEffect(() => {
    if (q) setQuery(q);
  }, [q]);

  const visible = catalog.filter(
    (a) =>
      (category === "Tout" || a.category === category) &&
      a.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
        {error && (
          <Pressable style={styles.errorBox} onPress={refresh}>
            <Text style={styles.errorText}>{error} Touchez pour réessayer.</Text>
          </Pressable>
        )}
      <View style={styles.top}>
        <View style={styles.header}>
          <Text style={styles.title}>Trouvez près de chez vous</Text>
          <Text style={styles.subtitle}>Cocody, Abidjan · moins de 1 km</Text>
        </View>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher un article"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((c) => (
            <Chip key={c} label={c} active={c === category} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Près de vous</Text>
          <Pressable onPress={() => router.push("/carte")}>
            <Text style={styles.link}>Voir la carte</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={padToEven(visible)}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) =>
          item.id === EMPTY_ID ? (
            <View style={{ flex: 1 }} />
          ) : (
            <ArticleCard
              article={item}
              onPress={() => router.push({ pathname: "/article/[id]", params: { id: item.id } })}
            />
          )
        }
        ListEmptyComponent={<Text style={styles.empty}>Aucun article trouvé.</Text>}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await refresh();
          setRefreshing(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: spacing.lg, gap: spacing.md },
  header: { gap: spacing.xs, marginTop: spacing.sm },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  chips: { gap: spacing.sm },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  section: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  list: { padding: spacing.lg, gap: spacing.md },
  row: { gap: spacing.md },
  empty: { textAlign: "center", fontFamily: fonts.regular, color: colors.textMuted, marginTop: spacing.xl },
  errorBox: { backgroundColor: "#FDECEC", borderRadius: radius.field, padding: spacing.md },
  errorText: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});