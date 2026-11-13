import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LafiMap } from "../../components/Map/LafiMap";
import { SafeAreaView } from "react-native-safe-area-context";
import Chip from "../../components/Chip";
import { useArticles } from "../../store/ArticlesContext";
import { useAuth } from "../../store/AuthContext";
import { colors, fonts, radius, shadows, spacing } from "../../theme";
import { formatDistance, formatPrice } from "../../utils/format";

type ShopMarker = {
  id: string;
  name: string;
  phone?: string;
  open: boolean;
  distanceM: number;
  lat: number;
  lng: number;
  articlesCount: number;
  previewArticles: ReturnType<typeof useArticles>["catalog"];
};

const COCODY_REGION = {
  latitude: 5.3600,
  longitude: -3.9900,
  latitudeDelta: 0.032,
  longitudeDelta: 0.032,
};

export default function CarteScreen() {
  const router = useRouter();
  const { merchant } = useAuth();
  const { catalog } = useArticles();
  const mapRef = useRef<any>(null);
  const bottomListRef = useRef<FlatList>(null);

  const [onlyOpen, setOnlyOpen] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Redirection immédiate si un commerçant est connecté (il n'a pas accès à la carte client)
  useEffect(() => {
    if (merchant) {
      router.replace("/(tabs)");
    }
  }, [merchant, router]);

  // Construction de la liste des boutiques avec coordonnées GPS
  const shops = useMemo(() => {
    const map = new Map<string, ShopMarker>();

    for (const art of catalog) {
      if (!map.has(art.shop)) {
        const fallback = {
          lat: 5.3600 + (Math.random() - 0.5) * 0.015,
          lng: -3.9900 + (Math.random() - 0.5) * 0.015,
        };
        map.set(art.shop, {
          id: art.shop,
          name: art.shop,
          phone: art.shopPhone,
          open: art.open,
          distanceM: art.distanceM,
          lat: art.shopLat ?? fallback.lat,
          lng: art.shopLng ?? fallback.lng,
          articlesCount: 0,
          previewArticles: [],
        });
      }
      const s = map.get(art.shop)!;
      s.articlesCount += 1;
      if (s.previewArticles.length < 4) {
        s.previewArticles.push(art);
      }
    }

    const query = searchQuery.trim().toLowerCase();

    return Array.from(map.values())
      .filter((s) => {
        if (onlyOpen && !s.open) return false;
        if (maxDistance !== null && s.distanceM > maxDistance) return false;
        if (query.length > 0) {
          const matchName = s.name.toLowerCase().includes(query);
          const matchArticles = catalog.some(
            (art) =>
              art.shop === s.name &&
              (art.name.toLowerCase().includes(query) ||
                art.category.toLowerCase().includes(query)),
          );
          if (!matchName && !matchArticles) return false;
        }
        return true;
      })
      .sort((a, b) => a.distanceM - b.distanceM);
  }, [catalog, onlyOpen, maxDistance, searchQuery]);

  const selectedShop = shops.find((s) => s.id === selectedShopId) || shops[0] || null;

  useEffect(() => {
    if (shops.length > 0) {
      const currentExists = shops.some((s) => s.id === selectedShopId);
      if (!currentExists) {
        const first = shops[0];
        setSelectedShopId(first.id);
        mapRef.current?.animateToRegion(
          {
            latitude: first.lat,
            longitude: first.lng,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          },
          400,
        );
      }
    } else {
      setSelectedShopId(null);
    }
  }, [shops, selectedShopId]);

  function handleSelectShop(shop: ShopMarker) {
    setSelectedShopId(shop.id);
    mapRef.current?.animateToRegion(
      {
        latitude: shop.lat,
        longitude: shop.lng,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      400,
    );
  }

  function openInGoogleMaps(lat: number, lng: number, name: string) {
    // Lien officiel universel Google Maps (ouvre l'application native en mode itinéraire)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Erreur", "Impossible d'ouvrir Google Maps.");
    });
  }

  function contactWhatsApp(phone?: string) {
    if (!phone) return;
    const clean = phone.replace(/[^\d+]/g, "");
    Linking.openURL(`https://wa.me/${clean}`).catch(() => { });
  }

  function recenterMap() {
    mapRef.current?.animateToRegion(COCODY_REGION, 400);
  }

  if (merchant) {
    return null;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>Carte des boutiques</Text>
            <Text style={styles.subtitle}>Cocody, Abidjan · Touchez une boutique pour vous y rendre</Text>
          </View>
          <Pressable style={styles.recenterBtn} onPress={recenterMap} hitSlop={8}>
            <Ionicons name="locate" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* Barre de recherche instantanée */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une boutique, un produit..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.trim().length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Filtres rapides */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Chip
            label="Toutes"
            active={!onlyOpen && maxDistance === null}
            onPress={() => {
              setOnlyOpen(false);
              setMaxDistance(null);
            }}
          />
          <Chip
            label="Ouvertes"
            active={onlyOpen}
            onPress={() => setOnlyOpen(!onlyOpen)}
          />
          <Chip
            label="< 500 m"
            active={maxDistance === 500}
            onPress={() => setMaxDistance(maxDistance === 500 ? null : 500)}
          />
          <Chip
            label="< 1 km"
            active={maxDistance === 1000}
            onPress={() => setMaxDistance(maxDistance === 1000 ? null : 1000)}
          />
        </ScrollView>
      </View>

      {/* Conteneur de la carte interactive (Google Maps sur mobile, OpenStreetMap sur web) */}
      <View style={styles.mapContainer}>
        <LafiMap
          ref={mapRef}
          shops={shops}
          selectedShop={selectedShop}
          onSelectShop={handleSelectShop}
          initialRegion={COCODY_REGION}
          pinStyles={{
            pinContainer: styles.pinContainer,
            pinContainerSelected: styles.pinContainerSelected,
            pinHead: styles.pinHead,
            pinHeadOpen: styles.pinHeadOpen,
            pinHeadClosed: styles.pinHeadClosed,
            pinHeadSelected: styles.pinHeadSelected,
            pinTip: styles.pinTip,
            pinTipOpen: styles.pinTipOpen,
            pinTipClosed: styles.pinTipClosed,
            pinTipSelected: styles.pinTipSelected,
          }}
        />

        {/* Badge Google Maps & nombre de boutiques */}
        {shops.length === 0 ? (
          <View style={[styles.floatingHelpBadge, styles.floatingHelpBadgeEmpty]}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
            <Text style={[styles.floatingHelpText, styles.floatingHelpTextEmpty]}>
              Aucune boutique pour « {searchQuery} »
            </Text>
          </View>
        ) : (
          <View style={styles.floatingHelpBadge}>
            <Ionicons name="navigate" size={13} color={colors.primary} />
            <Text style={styles.floatingHelpText}>
              {searchQuery.trim().length > 0
                ? `${shops.length} boutique${shops.length > 1 ? "s" : ""} trouvée${shops.length > 1 ? "s" : ""}`
                : `${shops.length} boutique${shops.length > 1 ? "s" : ""} à proximité`}
            </Text>
          </View>
        )}
      </View>

      {/* Fiche détaillée de la boutique sélectionnée (fixe en bas) */}
      {selectedShop && (
        <View style={styles.bottomCard}>
          <View style={styles.shopHeaderRow}>
            <View style={styles.shopInfo}>
              <View style={styles.shopNameRow}>
                <Text style={styles.shopName}>{selectedShop.name}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: selectedShop.open ? colors.openSurface : colors.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: selectedShop.open ? colors.open : colors.textMuted },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: selectedShop.open ? colors.open : colors.textMuted },
                    ]}
                  >
                    {selectedShop.open ? "Ouverte" : "Fermée"}
                  </Text>
                </View>
              </View>

              <Text style={styles.distanceText}>
                À environ {formatDistance(selectedShop.distanceM)} de vous · {selectedShop.articlesCount} article(s)
              </Text>
            </View>
          </View>

          {/* Aperçu des articles de la boutique */}
          {selectedShop.previewArticles.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.articlesRow}
            >
              {selectedShop.previewArticles.map((art) => (
                <Pressable
                  key={art.id}
                  style={styles.articleThumb}
                  onPress={() => router.push({ pathname: "/article/[id]", params: { id: art.id } })}
                >
                  {art.photoUri ? (
                    <Image source={{ uri: art.photoUri }} style={styles.thumbImg} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumbImg, { backgroundColor: art.color }]} />
                  )}
                  <Text style={styles.thumbName} numberOfLines={1}>
                    {art.name}
                  </Text>
                  <Text style={styles.thumbPrice}>{formatPrice(art.price)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Boutons d'action : ITINÉRAIRE GOOGLE MAPS + WHATSAPP */}
          <View style={styles.actionButtonsRow}>
            <Pressable
              style={({ pressed }) => [styles.googleMapsBtn, pressed && styles.btnPressed]}
              onPress={() => openInGoogleMaps(selectedShop.lat, selectedShop.lng, selectedShop.name)}
            >
              <Ionicons name="navigate" size={17} color="#FFFFFF" />
              <Text style={styles.googleMapsBtnText}>Itinéraire Google Maps</Text>
            </Pressable>

            {selectedShop.phone && (
              <Pressable
                style={({ pressed }) => [styles.whatsappBtn, pressed && styles.btnPressed]}
                onPress={() => contactWhatsApp(selectedShop.phone)}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  recenterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    gap: 8,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 2,
  },
  filters: {
    gap: spacing.xs,
    paddingTop: 4,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  floatingHelpBadge: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  floatingHelpText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  floatingHelpBadgeEmpty: {
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  floatingHelpTextEmpty: {
    color: colors.danger,
  },
  pinContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  pinContainerSelected: {
    transform: [{ scale: 1.18 }],
    zIndex: 99,
  },
  pinHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    ...shadows.button,
  },
  pinHeadOpen: {
    backgroundColor: colors.primary,
  },
  pinHeadClosed: {
    backgroundColor: colors.textMuted,
  },
  pinHeadSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: "#FFFFFF",
    borderWidth: 2.5,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.primary,
    marginTop: -2,
  },
  pinTipOpen: {
    borderTopColor: colors.primary,
  },
  pinTipClosed: {
    borderTopColor: colors.textMuted,
  },
  pinTipSelected: {
    borderTopColor: colors.primaryDark,
  },
  bottomCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
    ...shadows.float,
  },
  shopHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shopInfo: {
    flex: 1,
    gap: 2,
  },
  shopNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shopName: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  distanceText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  articlesRow: {
    gap: 8,
    paddingVertical: 2,
  },
  articleThumb: {
    width: 90,
    gap: 2,
  },
  thumbImg: {
    width: 90,
    height: 60,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  thumbName: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.text,
  },
  thumbPrice: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.primary,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  googleMapsBtn: {
    flex: 1,
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadows.button,
  },
  googleMapsBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  whatsappBtn: {
    width: 46,
    height: 46,
    backgroundColor: colors.whatsapp,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.button,
  },
  btnPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
});
