/**
 * src/app/(tabs)/panier.tsx
 * -------------------------
 * Écran du Panier d'achat de Lafi.
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Règle métier mono-boutique : garantit que tous les articles d'une même commande
 *   proviennent d'un commerçant unique pour simplifier le retrait ou la course Yango.
 * - Choix du mode de réception : bascule immédiate entre 'Retrait en boutique' (gratuit)
 *   et 'Livraison Yango' (tarif selon course, réglé en direct au livreur).
 * - Contrôle de quantité dynamique : ajustement ou suppression via le composant QuantityStepper.
 * - Persistance du panier : synchronisation avec CartContext.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import CustomerAuthModal from "../../components/CustomerAuthModal";
import QuantityStepper from "../../components/QuantityStepper";
import { useAuth } from "../../store/AuthContext";
import { DeliveryMode, useCart } from "../../store/CartContext";
import { colors, fonts, radius, shadows, spacing } from "../../theme";
import { formatPrice } from "../../utils/format";

type OptionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
};

function ModeOption({ icon, title, subtitle, selected, onPress }: OptionProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.optionPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Ionicons name={icon} size={20} color={selected ? colors.primary : colors.textMuted} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
          {title}
        </Text>
        <Text style={styles.optionSub}>{subtitle}</Text>
      </View>
      <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

export default function Panier() {
  const router = useRouter();
  const { items, shop, subtotal, deliveryFee, total, mode, setMode, setQty, clear } = useCart();
  const { customer, merchant } = useAuth();
  const [authModalVisible, setAuthModalVisible] = useState(false);

  useEffect(() => {
    if (merchant) {
      router.replace("/(tabs)");
    }
  }, [merchant, router]);

  if (merchant) {
    return null;
  }

  function confirmClear() {
    Alert.alert("Vider le panier", "Voulez-vous supprimer tous les articles du panier ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Vider", style: "destructive", onPress: clear },
    ]);
  }

  function handleCheckout() {
    if (!customer) {
      setAuthModalVisible(true);
      return;
    }
    router.push("/commande/recapitulatif");
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Panier</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptySubtitle}>
            Explorez les boutiques du quartier pour ajouter des articles.
          </Text>
          <View style={styles.emptyBtnWrap}>
            <Button
              label="Découvrir les articles"
              variant="primary"
              onPress={() => router.navigate("/")}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const modes: {
    id: DeliveryMode;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    sub: string;
  }[] = [
      {
        id: "pickup",
        icon: "storefront-outline",
        title: "Retrait en boutique",
        sub: "Sans frais · Chez le commerçant",
      },
      {
        id: "yango",
        icon: "car-outline",
        title: "Livraison Yango",
        sub: "Tarif selon course Yango · Payé au livreur",
      },
    ];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mon Panier</Text>
          <View style={styles.shopRow}>
            <Ionicons name="storefront-outline" size={13} color={colors.textMuted} />
            <Text style={styles.shopText}>Boutique : {shop}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.trashBtn, pressed && styles.btnPressed]}
          onPress={confirmClear}
          hitSlop={8}
          accessibilityLabel="Vider le panier"
        >
          <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cart Item Cards */}
        <View style={styles.itemsList}>
          {items.map(({ article, qty }) => (
            <View key={article.id} style={styles.itemCard}>
              <View style={styles.thumb}>
                {article.photoUri ? (
                  <Image
                    source={{ uri: article.photoUri }}
                    style={styles.thumbImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.thumbProduct, { backgroundColor: article.color }]} />
                )}
              </View>

              <View style={styles.itemDetails}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {article.name}
                  </Text>
                  <Pressable
                    onPress={() => setQty(article.id, 0)}
                    hitSlop={8}
                    accessibilityLabel="Supprimer"
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>

                <Text style={styles.itemCategory}>{article.category}</Text>

                <View style={styles.itemBottomRow}>
                  <Text style={styles.itemPrice}>{formatPrice(article.price)}</Text>
                  <QuantityStepper
                    value={qty}
                    onChange={(newQty) => setQty(article.id, newQty)}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de réception</Text>
          <View style={styles.optionsList}>
            {modes.map((m) => (
              <ModeOption
                key={m.id}
                icon={m.icon}
                title={m.title}
                subtitle={m.sub}
                selected={mode === m.id}
                onPress={() => setMode(m.id)}
              />
            ))}
          </View>
        </View>

        {/* Delivery Address if Yango */}
        {mode === "yango" && (
          <View style={styles.addressCard}>
            <View style={styles.addressIconWrap}>
              <Ionicons name="location" size={18} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.addressLabel}>Destination de livraison Yango</Text>
              <Text style={styles.addressValue}>
                {customer?.address
                  ? `${customer.address}`
                  : "Définie ou détectée au récapitulatif"}
              </Text>
            </View>
          </View>
        )}

        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Récapitulatif</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total articles</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {mode === "yango" ? "Livraison Yango" : "Retrait en boutique"}
            </Text>
            <Text style={styles.summaryValue}>
              {mode === "yango" ? "Selon course Yango" : "Gratuit"}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total articles à payer</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Checkout Pill Button */}
      <View style={styles.footer}>
        <Button
          label={`Commander · ${formatPrice(total)}`}
          icon="arrow-forward"
          variant="primary"
          onPress={handleCheckout}
        />
        <Text style={styles.footerNote}>
          Paiement des articles au commerçant · Course réglée au livreur Yango
        </Text>
      </View>

      <CustomerAuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={() => {
          setAuthModalVisible(false);
          router.push("/commande/recapitulatif");
        }}
        title="Identification requise"
        subtitle="Identifiez-vous pour valider et suivre votre commande."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  shopText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  trashBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.8,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyBtnWrap: {
    width: "100%",
    marginTop: spacing.md,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadows.card,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: {
    width: "90%",
    height: "90%",
  },
  thumbProduct: {
    width: 38,
    height: 30,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    gap: 2,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  itemCategory: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  itemBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  itemPrice: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  optionsList: {
    gap: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadows.card,
  },
  optionSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  optionTitleSelected: {
    color: colors.primary,
  },
  optionSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadows.card,
  },
  addressIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  addressLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  addressValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
    ...shadows.card,
  },
  summaryTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  totalLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  totalValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
    ...shadows.float,
  },
  footerNote: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
});
