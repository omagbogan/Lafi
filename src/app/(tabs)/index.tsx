/**
 * src/app/(tabs)/index.tsx
 * ------------------------
 * Écran d'accueil principal de Lafi et aiguillage centralisé des rôles.
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 4 - Agent IA) :
 * - Aiguillage automatique : si un commerçant est connecté, l'écran bascule immédiatement
 *   sur le tableau de bord MerchantBoutiqueView (gestion de sa boutique).
 * - Assistant IA intégré : bannière Hero invitant à échanger avec l'agent conversationnel
 *   pour trouver des produits par texte, budget ou photo.
 * - Catalogue et filtrage réactif : recherche instantanée par mots-clés et sélection par catégorie.
 * - Notifications en temps réel : cloche avec pastille rouge dynamique alertant sur l'état des commandes.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArticleCard from "../../components/ArticleCard";
import AssistantModal from "../../components/AssistantModal";
import CustomerAuthModal from "../../components/CustomerAuthModal";
import MerchantBoutiqueView from "../../components/MerchantBoutiqueView";
import NotificationsModal, { useNotifications } from "../../components/NotificationsModal";
import { useArticles } from "../../store/ArticlesContext";
import { useAuth } from "../../store/AuthContext";
import { colors, fonts, radius, shadows, spacing } from "../../theme";
import { EMPTY_ID, padToEven } from "../../utils/grid";

type CategoryConfig = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const CATEGORY_ITEMS: CategoryConfig[] = [
  { name: "Alimentation", icon: "restaurant-outline", color: "#10B981" },
  { name: "Mode", icon: "shirt-outline", color: "#6366F1" },
  { name: "Beauté", icon: "sparkles-outline", color: "#EC4899" },
  { name: "Électronique", icon: "headset-outline", color: "#2C64E8" },
  { name: "Maison", icon: "home-outline", color: "#F59E0B" },
  { name: "Bébé", icon: "happy-outline", color: "#8B5CF6" },
];

export default function Home() {
  const router = useRouter();
  const { catalog, refresh, error } = useArticles();
  const { customer, merchant } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const { unreadCount, markAllAsRead } = useNotifications();

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

  // Si un commerçant est connecté, il accède EXCLUSIVEMENT à sa boutique
  if (merchant) {
    return <MerchantBoutiqueView />;
  }

  const visible = catalog.filter(
    (a) =>
      (category === "Tout" || a.category === category) &&
      a.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function handleCategoryPress(catName: string) {
    if (category === catName) {
      setCategory("Tout");
    } else {
      setCategory(catName);
    }
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Bandeau Téléchargement APK - Visible exclusivement sur le Web */}
      {Platform.OS === "web" && (
        <View style={styles.webApkBanner}>
          <View style={styles.webApkLeft}>
            <View style={styles.webApkIconBox}>
              <Ionicons name="phone-portrait" size={20} color={colors.primary} />
            </View>
            <View style={styles.webApkTextWrap}>
              <Text style={styles.webApkTitle}>Application Mobile Lafi (Android)</Text>
              <Text style={styles.webApkSubtitle}>
                Téléchargez le fichier APK directement pour installer Lafi sur votre smartphone
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.webApkBtn, pressed && styles.webApkBtnPressed]}
            onPress={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/lafi.apk";
              }
            }}
            accessibilityLabel="Télécharger l'APK Android de Lafi"
          >
            <Ionicons name="cloud-download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.webApkBtnText}>Télécharger l'APK</Text>
          </Pressable>
        </View>
      )}

      {/* Hero Banner - Assistant IA Dégradé Bleu Moderne */}
      <Pressable
        style={({ pressed }) => [styles.heroBannerWrap, pressed && styles.bannerPressed]}
        onPress={() => {
          if (!customer) {
            setAuthModalVisible(true);
          } else {
            setAssistantVisible(true);
          }
        }}
        accessibilityLabel="Ouvrir l'assistant intelligent"
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>IA Générative Lafi</Text>
            </View>
            <Text style={styles.heroTitle}>Besoin d'un conseil ?</Text>
            <Text style={styles.heroSubtitle}>
              Trouvez le produit parfait selon votre besoin, votre photo ou votre budget
            </Text>
            <View style={styles.heroBtn}>
              <Text style={styles.heroBtnText}>Discuter avec l'IA</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          </View>
          <View style={styles.heroIllustration}>
            <View style={styles.heroCircleGlow}>
              <Ionicons name="chatbubbles" size={48} color="rgba(255, 255, 255, 0.9)" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>

      {/* Categories Grid - 6 Squircles */}
      <View style={styles.categoriesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Catégories</Text>
          {category !== "Tout" && (
            <Pressable onPress={() => setCategory("Tout")}>
              <Text style={styles.resetFilter}>Voir tout</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.categoryGrid}>
          {CATEGORY_ITEMS.map((item) => {
            const isSelected = category === item.name;
            return (
              <Pressable
                key={item.name}
                style={({ pressed }) => [
                  styles.categoryCard,
                  isSelected && styles.categoryCardActive,
                  pressed && styles.categoryCardPressed,
                ]}
                onPress={() => handleCategoryPress(item.name)}
              >
                <View
                  style={[
                    styles.categoryIconWrap,
                    isSelected && styles.categoryIconWrapActive,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isSelected ? colors.primary : colors.text}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryName,
                    isSelected && styles.categoryNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Section Articles */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            {category === "Tout" ? "Articles près de chez vous" : category}
          </Text>
          <Text style={styles.sectionSub}>Cocody, Abidjan · Moins de 1 km</Text>
        </View>
        <Pressable onPress={() => router.push("/carte")}>
          <Text style={styles.seeAllLink}>Voir la carte</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Top App Bar Fixe : Marque Lafi épurée + Cloche Notification */}
      <View style={styles.topBar}>
        <Text style={styles.brandTitle}>Lafi</Text>
        <Pressable
          style={styles.bellBtn}
          onPress={() => {
            setNotifVisible(true);
            markAllAsRead();
          }}
          hitSlop={8}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Barre de recherche Fixe - 100% stable, le clavier ne disparaît JAMAIS */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher sur Lafi..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {error && (
        <Pressable style={styles.errorBox} onPress={refresh}>
          <Text style={styles.errorText}>{error} Touchez pour réessayer.</Text>
        </Pressable>
      )}

      <FlatList
        data={padToEven(visible)}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={renderHeader}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.empty}>Aucun article trouvé dans cette sélection.</Text>
          </View>
        }
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await refresh();
          setRefreshing(false);
        }}
      />

      <AssistantModal visible={assistantVisible} onClose={() => setAssistantVisible(false)} />
      <CustomerAuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={() => {
          setAuthModalVisible(false);
          setAssistantVisible(true);
        }}
        title="Assistant Intelligent Lafi"
        subtitle="Identifiez-vous pour discuter avec l'assistant IA et trouver ce dont vous avez besoin."
      />
      <NotificationsModal visible={notifVisible} onClose={() => setNotifVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  brandTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.primary,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
    overflow: "visible",
    ...shadows.card,
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.card,
    zIndex: 10,
    elevation: 4,
  },
  bellBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 12,
    color: "#FFFFFF",
    textAlign: "center",
    includeFontPadding: false,
  },
  searchBarWrapper: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
    ...shadows.card,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerContainer: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  heroBannerWrap: {
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadows.button,
  },
  heroBanner: {
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.card,
  },
  bannerPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  heroContent: {
    flex: 1,
    gap: 6,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  heroBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#FFFFFF",
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#FFFFFF",
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 16,
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  heroBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  heroIllustration: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCircleGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  categoriesSection: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  sectionSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  resetFilter: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  seeAllLink: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  categoryCard: {
    width: "31%",
    backgroundColor: colors.card,
    borderRadius: radius.squircle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...shadows.card,
  },
  categoryCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryCardPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconWrapActive: {
    backgroundColor: "#FFFFFF",
  },
  categoryName: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
    textAlign: "center",
  },
  categoryNameActive: {
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
  row: {
    gap: spacing.md,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  empty: {
    textAlign: "center",
    fontFamily: fonts.medium,
    color: colors.textMuted,
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.field,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  webApkBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  webApkLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.sm,
  },
  webApkIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  webApkTextWrap: {
    flex: 1,
  },
  webApkTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  webApkSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  webApkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    ...shadows.button,
  },
  webApkBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  webApkBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: "#FFFFFF",
  },
});
