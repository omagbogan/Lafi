/**
 * src/components/MerchantBoutiqueView.tsx
 * ---------------------------------------
 * Tableau de bord principal de gestion de boutique pour le Commerçant.
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Carte d'identité de la boutique : affichage du nom, gérant, téléphone WhatsApp, adresse et GPS,
 *   avec bouton 'Modifier' pour actualiser les données en 1 tap (EditShopModal).
 * - Sélecteur Ouverte / Fermée : désactivation instantanée de la visibilité des articles pour les clients.
 * - Grille catalogue commerçant : affichage des produits avec boutons d'édition rapide (EditArticleSheet),
 *   masquage temporaire (toggle 'hidden') et redirection vers la publication ('Ajouter').
 * - Partage de boutique : lien copiable en 1 clic (expo-clipboard).
 */

import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EditArticleSheet from "./EditArticleSheet";
import EditShopModal from "./EditShopModal";
import MyArticleCard from "./MyArticleCard";
import NotificationsModal, { useNotifications } from "./NotificationsModal";
import { Article } from "../data/articles";
import { useArticles } from "../store/ArticlesContext";
import { useAuth } from "../store/AuthContext";
import { colors, fonts, radius, shadows, spacing } from "../theme";
import { EMPTY_ID, padToEven } from "../utils/grid";

export default function MerchantBoutiqueView() {
  const router = useRouter();
  const { merchant } = useAuth();
  const { myArticles, shopOpen, setShopOpen, updateArticle, refresh } = useArticles();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [editShopVisible, setEditShopVisible] = useState(false);
  const { unreadCount, markAllAsRead } = useNotifications();

  // Actualiser automatiquement quand l'écran revient au premier plan
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function onPullToRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const shopName = merchant?.shopName || "Ma Boutique";
  const ownerName = merchant?.ownerName || "Gérant";
  const address = merchant?.address || "Cocody, Abidjan";
  const phone = merchant?.phone || "";
  const shopSlug = merchant
    ? merchant.shopName.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "maboutique";
  const shopLink = `lafi.app/${shopSlug}`;

  async function copyLink() {
    await Clipboard.setStringAsync(`https://${shopLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const header = (
    <View style={styles.headerContent}>
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

      {/* Carte d'identité de la boutique */}
      <View style={styles.shopCard}>
        <View style={styles.shopTopRow}>
          <View style={styles.storeIconCircle}>
            <Ionicons name="storefront" size={26} color={colors.primary} />
          </View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopTitle}>{shopName}</Text>
            <Text style={styles.ownerSubtitle}>
              {ownerName} {phone ? `· ${phone}` : ""}
            </Text>
          </View>
          <Pressable
            style={styles.editPill}
            onPress={() => setEditShopVisible(true)}
            hitSlop={8}
            accessibilityLabel="Modifier les informations de la boutique"
          >
            <Ionicons name="pencil" size={12} color={colors.primary} />
            <Text style={styles.editPillText}>Modifier</Text>
          </Pressable>
        </View>

        {address ? (
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <Text style={styles.locText} numberOfLines={2}>
              {address}
            </Text>
          </View>
        ) : null}

        {/* Sélecteur Ouverte / Fermée */}
        <View style={styles.segment}>
          <Pressable
            style={[styles.seg, shopOpen && styles.segOpen]}
            onPress={() => setShopOpen(true)}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={shopOpen ? "#FFFFFF" : colors.textMuted}
            />
            <Text style={[styles.segText, shopOpen && styles.segTextOn]}>Ouverte</Text>
          </Pressable>
          <Pressable
            style={[styles.seg, !shopOpen && styles.segClosed]}
            onPress={() => setShopOpen(false)}
          >
            <Ionicons
              name="pause-circle"
              size={16}
              color={!shopOpen ? "#FFFFFF" : colors.textMuted}
            />
            <Text style={[styles.segText, !shopOpen && styles.segTextOn]}>Fermée</Text>
          </Pressable>
        </View>

        {!shopOpen && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.warningText}>
              Votre boutique est fermée. Vos articles ne sont plus visibles par les clients.
            </Text>
          </View>
        )}

        {/* Lien de partage boutique */}
        <View style={styles.linkCard}>
          <Ionicons name="link-outline" size={18} color={colors.primary} />
          <Text style={styles.linkText} numberOfLines={1}>
            {shopLink}
          </Text>
          <Pressable style={styles.copyBtn} onPress={copyLink}>
            <Text style={styles.copyBtnText}>{copied ? "Copié ✓" : "Copier"}</Text>
          </Pressable>
        </View>
      </View>

      {/* Titre de section et bouton Ajouter */}
      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>Mes articles</Text>
          <Text style={styles.sectionSubtitle}>
            {myArticles.length} produit{myArticles.length > 1 ? "s" : ""} au catalogue
          </Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push("/commercant/nouvel-article")}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Barre supérieure */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Gestion Boutique</Text>
        <Pressable
          style={styles.bellBtn}
          onPress={() => {
            setNotifVisible(true);
            markAllAsRead();
          }}
          hitSlop={8}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <FlatList
        data={padToEven(myArticles)}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullToRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="storefront-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Votre boutique est prête !</Text>
            <Text style={styles.emptySubtitle}>
              Vous n'avez pas encore d'articles en rayon. Touchez « Ajouter » pour publier votre premier produit avec photo et prix.
            </Text>
            <Pressable
              style={styles.emptyActionBtn}
              onPress={() => router.push("/commercant/nouvel-article")}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>Ajouter mon premier article</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) =>
          item.id === EMPTY_ID ? (
            <View style={styles.emptyPlaceholder} />
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
      <EditShopModal visible={editShopVisible} onClose={() => setEditShopVisible(false)} />
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  bellBadge: {
    position: "absolute",
    top: -3,
    right: -3,
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
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  emptyPlaceholder: {
    flex: 1,
  },
  headerContent: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  shopCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  shopTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  storeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F4EBE1",
    alignItems: "center",
    justifyContent: "center",
  },
  shopInfo: {
    flex: 1,
    gap: 2,
  },
  shopTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  ownerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
  },
  locText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    padding: 4,
    gap: 4,
    marginTop: spacing.xs,
  },
  seg: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.field - 2,
    gap: 6,
  },
  segOpen: {
    backgroundColor: colors.open,
  },
  segClosed: {
    backgroundColor: colors.danger,
  },
  segText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  segTextOn: {
    fontFamily: fonts.semibold,
    color: "#FFFFFF",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FDE8E8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.field,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: spacing.xs,
  },
  linkText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },
  copyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  copyBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: "#FFFFFF",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...shadows.card,
  },
  addBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: spacing.sm,
  },
  emptyActionBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  editPillText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
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

