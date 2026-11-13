/**
 * src/app/commande/recapitulatif.tsx
 * ----------------------------------
 * Écran de récapitulatif avant validation finale de la commande.
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Informations client : affichage des coordonnées du profil (nom, WhatsApp, adresse de livraison).
 * - Transparence tarifaire : pas de frais de livraison cachés ajoutés (course Yango payée au livreur).
 * - Recalcul serveur garanti : validation stricte des prix par l'API FastAPI lors de la soumission.
 * - Paiement direct : rappel clair des modalités de règlement de main à main.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import CustomerAuthModal from "../../components/CustomerAuthModal";
import { useAuth } from "../../store/AuthContext";
import { useCart } from "../../store/CartContext";
import { useOrders } from "../../store/OrdersContext";
import { colors, fonts, radius, shadows, spacing } from "../../theme";
import { formatPrice } from "../../utils/format";

export default function Recapitulatif() {
  const router = useRouter();
  const { items, shop, subtotal, deliveryFee, total, mode, clear } = useCart();
  const { addOrder } = useOrders();
  const { customer } = useAuth();
  const [sending, setSending] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);

  if (!shop) return null;

  async function finalizeOrder(activeCustomer = customer) {
    if (!activeCustomer || sending) return;
    setSending(true);
    try {
      const id = await addOrder(items, mode, activeCustomer);
      clear();
      router.replace({ pathname: "/commande/confirmation", params: { id } });
    } catch (error) {
      Alert.alert(
        "Commande impossible",
        error instanceof Error ? error.message : "Réessayez dans un instant.",
      );
      setSending(false);
    }
  }

  async function handleOrderWithCustomer(activeCustomer = customer) {
    if (!activeCustomer) {
      setAuthModalVisible(true);
      return;
    }
    await finalizeOrder(activeCustomer);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Récapitulatif</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Coordonnées de contact du client */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Vos coordonnées de contact</Text>
          {customer ? (
            <View style={styles.clientDetails}>
              <View style={styles.clientRow}>
                <Ionicons name="person-outline" size={16} color={colors.primary} />
                <Text style={styles.clientTextBold}>{customer.name}</Text>
              </View>
              <View style={styles.clientRow}>
                <Ionicons name="call-outline" size={16} color={colors.primary} />
                <Text style={styles.clientText}>{customer.phone}</Text>
              </View>
              <View style={styles.clientRow}>
                <Ionicons name="home-outline" size={16} color={colors.textMuted} />
                <Text style={styles.clientSubText}>
                  {mode === "yango" ? "Lieu de livraison" : "Adresse de résidence"} : {customer.address}
                </Text>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.guestAlert}
              onPress={() => setAuthModalVisible(true)}
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <View style={styles.flex}>
                <Text style={styles.guestTitle}>Inscription requise pour commander</Text>
                <Text style={styles.guestSub}>
                  Touchez ici pour renseigner votre nom, téléphone et quartier de livraison.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {/* Boutique commerçant */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Boutique</Text>
          <Text style={styles.cardValue}>{shop}</Text>
        </View>

        {/* Détail des articles commandés */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Articles ({items.length})</Text>
          {items.map(({ article, qty }) => (
            <View key={article.id} style={styles.line}>
              <Text style={styles.lineName} numberOfLines={1}>
                {article.name} × {qty}
              </Text>
              <Text style={styles.lineValue}>{formatPrice(article.price * qty)}</Text>
            </View>
          ))}
        </View>

        {/* Mode de réception */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Réception</Text>
          <Text style={styles.cardValue}>
            {mode === "yango"
              ? `Livraison Yango · ${customer?.address || "Adresse client"}`
              : "Retrait en boutique"}
          </Text>
        </View>

        {/* Total financier */}
        <View style={styles.card}>
          <View style={styles.line}>
            <Text style={styles.lineName}>Articles</Text>
            <Text style={styles.lineValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.lineName}>
              {mode === "yango" ? "Livraison Yango" : "Retrait"}
            </Text>
            <Text style={styles.lineValue}>
              {mode === "yango" ? "Selon course Yango (au livreur)" : "Gratuit"}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.line}>
            <Text style={styles.totalLabel}>Total articles à payer</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        {/* Modalité de paiement */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Modalité de paiement</Text>
          <View style={styles.paymentInfoRow}>
            <View style={styles.paymentIconWrap}>
              <Ionicons
                name={mode === "yango" ? "car-outline" : "storefront-outline"}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.paymentTitle}>
                {mode === "yango"
                  ? "Paiement à la livraison Yango"
                  : "Paiement direct en boutique"}
              </Text>
              <Text style={styles.paymentSub}>
                {mode === "yango"
                  ? "Réglez vos articles au commerçant et la course directement au livreur Yango (espèces ou Mobile Money)."
                  : "Réglez au commerçant lors du retrait au comptoir (espèces ou Mobile Money direct)."}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={sending ? "Envoi de la commande…" : "Valider la commande"}
          variant="primary"
          onPress={() => handleOrderWithCustomer(customer)}
          disabled={sending}
        />
      </View>

      <CustomerAuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={() => {
          setAuthModalVisible(false);
        }}
        title="Coordonnées de livraison"
        subtitle="Renseignez votre nom et numéro pour que le commerçant prépare votre commande."
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
    paddingVertical: spacing.md,
  },
  topTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.card,
  },
  cardLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  cardValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  clientDetails: {
    gap: 6,
    paddingTop: 2,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  clientTextBold: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  clientText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  clientSubText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  guestAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.field,
  },
  guestTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  guestSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  flex: { flex: 1 },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  lineName: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  lineValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  separator: { height: 1, backgroundColor: colors.border },
  totalLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  totalValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  paymentInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
  },
  paymentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  paymentSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    ...shadows.float,
  },
});
