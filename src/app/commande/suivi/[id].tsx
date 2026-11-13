/**
 * src/app/commande/suivi/[id].tsx
 * -------------------------------
 * Écran de suivi en temps réel de la commande (Client).
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Timeline d'avancement réactive : En attente -> Acceptée -> En cours -> Terminée / Refusée.
 * - Sécurisation du retrait comptoir : affichage du code secret OTP à 4 chiffres à présenter en boutique.
 * - Intégration avancée Yango Livraison (Course colis) :
 *   - Lancement natif de l'application Yango (schéma yandexyango://route?tariffClass=delivery...).
 *   - Transmission des coordonnées GPS précises de départ (boutique) et d'arrivée (client).
 *   - Récapitulatif visuel clair des adresses d'enlèvement et de dépose.
 * - Gestion du refus commerçant : carte d'explication rouge avec orientation vers des boutiques alternatives.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../../components/Button";
import SwipeButton from "../../../components/SwipeButton";
import { api, Order } from "../../../services/api";
import { useOrders } from "../../../store/OrdersContext";
import { colors, fonts, radius, spacing } from "../../../theme";
import { formatPrice } from "../../../utils/format";
import { timeAgo } from "../../../utils/time";
import { useNow } from "../../../utils/useNow";

// Pour la démonstration : 1 minute. À fixer avec de vrais commerçants.
const ORDER_TIMEOUT_MS = 60000;

type Step = {
  title: string;
  subtitle?: string;
  state: "done" | "current" | "todo" | "error";
};

function StepRow({ step, last }: { step: Step; last: boolean }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.rail}>
        <View
          style={[
            styles.circle,
            step.state === "done" && styles.circleDone,
            step.state === "current" && styles.circleCurrent,
            step.state === "error" && styles.circleError,
          ]}
        >
          {step.state === "done" && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          {step.state === "error" && <Ionicons name="close" size={14} color="#FFFFFF" />}
          {step.state === "current" && <View style={styles.dot} />}
        </View>
        {!last && <View style={[styles.line, step.state === "done" && styles.lineDone]} />}
      </View>
      <View style={styles.stepText}>
        <Text style={[styles.stepTitle, step.state === "todo" && styles.stepTodo]}>{step.title}</Text>
        {step.subtitle && <Text style={styles.stepSub}>{step.subtitle}</Text>}
      </View>
    </View>
  );
}

export default function Suivi() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cancelOrder } = useOrders();
  const now = useNow(5000);
  const [order, setOrder] = useState<Order | null>(null);
  const [failed, setFailed] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Interroge le serveur toutes les 5 secondes pour suivre l'avancement
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.getOrder(id);
        if (active) {
          setOrder(data);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  if (!order) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.notFound}>
          {failed ? "Impossible de charger la commande. Vérifiez votre connexion." : "Chargement…"}
        </Text>
      </SafeAreaView>
    );
  }

  const accepted = order.status === "accepted";
  const completed = order.status === "completed";
  const refused = order.status === "refused";
  const cancelled = order.status === "cancelled";
  const silent = order.status === "pending" && now - order.createdAt > ORDER_TIMEOUT_MS;
  const yango = order.mode === "yango";

  // L'annulation est permise :
  // 1. Quand la commande est envoyée et pas encore acceptée (status === "pending")
  // 2. Quand la commande est acceptée, durant la confirmation du livreur / avant remise du colis
  const canCancel =
    order.status === "pending" ||
    (order.status === "accepted" && !order.packageHandedOver);

  const steps: Step[] = [
    { title: "Commande envoyée", subtitle: timeAgo(order.createdAt), state: "done" },
    cancelled
      ? { title: "Commande annulée", state: "error" }
      : refused
        ? { title: "Refusée par le commerçant", state: "error" }
        : {
            title: accepted || completed ? "Acceptée par le commerçant" : "En attente du commerçant",
            state: accepted || completed ? "done" : "current",
          },
    {
      title: yango
        ? order.packageHandedOver
          ? "Colis remis au livreur"
          : order.driverDispatched
            ? "Livreur en route vers la boutique"
            : "Commande du livreur Yango"
        : "Prête au retrait",
      subtitle: yango
        ? order.packageHandedOver
          ? "Course en cours vers votre adresse"
          : order.driverDispatched
            ? "Livreur notifié, en approche de la boutique"
            : "À commander via l'application Yango"
        : "Chez le commerçant",
      state: completed
        ? "done"
        : order.packageHandedOver
          ? "done"
          : order.driverDispatched
            ? "current"
            : accepted
              ? "current"
              : "todo",
    },
    {
      title: yango ? "Colis livré et payé" : "Retirée et payée",
      state: completed ? "done" : "todo",
    },
  ];
  const visible = refused || cancelled ? steps.slice(0, 2) : steps;

  const firstWord = order.items[0].article.name.split(" ")[0];

  const handleCancelOrder = () => {
    Alert.alert(
      "Annuler la commande",
      "Êtes-vous sûr de vouloir annuler cette commande ?",
      [
        { text: "Non, garder", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelling(true);
              const ok = await cancelOrder(order.id);
              if (ok) {
                setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : null));
              }
            } catch (err) {
              Alert.alert(
                "Annulation impossible",
                err instanceof Error ? err.message : "Une erreur est survenue lors de l'annulation.",
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const handleOpenYango = async () => {
    const startLat = order.shopLat ?? 5.359952;
    const startLon = order.shopLng ?? -4.008256;
    const endLat = order.customerLat ?? 5.348;
    const endLon = order.customerLng ?? -4.01;

    // Paramètres exacts pour pré-remplir le départ, l'arrivée et la classe tarifaire "delivery" avec le suivi AppMetrica en français
    const params = `start-lat=${startLat}&start-lon=${startLon}&end-lat=${endLat}&end-lon=${endLon}&tariffClass=delivery&appmetrica_tracking_id=1178268795219785167&lang=fr`;

    // 1. Schéma natif direct de l'application Yango (yandexyango://route)
    // 2. Lien universel Yango (yango.go.link/route) avec le jeton Adjust Côte d'Ivoire pour rediriger vers com.yandex.yango
    // 3. Lien de redirection AppMetrica (3.redirect.appmetrica.yandex.com/route)
    const appCandidates = [
      `yandexyango://route?${params}`,
      `https://yango.go.link/route?${params}&adj_t=ed2iv9w_topwm5j`,
      `https://3.redirect.appmetrica.yandex.com/route?${params}`,
    ];

    for (const targetUrl of appCandidates) {
      try {
        await Linking.openURL(targetUrl);
        return;
      } catch {
        // En cas d'échec sur ce candidat, on tente le suivant
      }
    }

    // Si aucune application Yango n'a pu s'ouvrir sur l'appareil
    Alert.alert(
      "Application Yango introuvable",
      "L'application Yango ne s'est pas ouverte. Vérifiez qu'elle est bien installée sur votre téléphone.",
      [
        { text: "Fermer", style: "cancel" },
        {
          text: "Télécharger Yango",
          onPress: () => {
            const storeUrl =
              Platform.OS === "ios"
                ? "https://apps.apple.com/app/yango-taxi/id1437157286"
                : "https://play.google.com/store/apps/details?id=com.yandex.yango";
            Linking.openURL(storeUrl).catch(() => {});
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable style={styles.back} onPress={() => router.replace("/")}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Ma commande</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.shop}>{order.shop}</Text>
            <Text style={styles.total}>{formatPrice(order.total)}</Text>
          </View>
          <Text style={styles.sub}>
            {order.items.reduce((sum, i) => sum + i.qty, 0)} article(s) · paiement{" "}
            {yango ? "à la livraison" : "au retrait"}
          </Text>
        </View>

        <View style={styles.card}>
          {visible.map((step, index) => (
            <StepRow key={step.title} step={step} last={index === visible.length - 1} />
          ))}
        </View>

        {refused && (
          <View style={styles.refusedCard}>
            <View style={styles.refusedIconWrap}>
              <Ionicons name="close-circle" size={36} color={colors.danger} />
            </View>
            <Text style={styles.refusedTitle}>Commande refusée</Text>
            <Text style={styles.refusedText}>
              La boutique « {order.shop} » ne peut pas honorer votre commande pour le moment (article indisponible ou boutique occupée).
            </Text>
            <Button
              label="Voir d'autres commerçants"
              variant="secondary"
              onPress={() => router.navigate({ pathname: "/", params: { q: firstWord } })}
            />
          </View>
        )}

        {cancelled && (
          <View style={styles.refusedCard}>
            <View style={styles.refusedIconWrap}>
              <Ionicons name="close-circle" size={36} color={colors.danger} />
            </View>
            <Text style={styles.refusedTitle}>Commande annulée</Text>
            <Text style={styles.refusedText}>
              Cette commande a bien été annulée. Aucun montant n'a été prélevé.
            </Text>
            <Button
              label="Retour aux articles"
              variant="secondary"
              onPress={() => router.replace("/")}
            />
          </View>
        )}

        {silent && (
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>Ce commerçant ne répond pas pour le moment.</Text>
            <Text style={styles.warningText}>Vous pouvez voir d'autres commerçants proches qui ont cet article.</Text>
            <Button
              label="Voir d'autres commerçants"
              variant="secondary"
              onPress={() => router.navigate({ pathname: "/", params: { q: firstWord } })}
            />
          </View>
        )}

        {/* Retrait en boutique : affichage du code secret OTP à 4 chiffres */}
        {accepted && !completed && !yango && (
          <View style={styles.pickupCodeCard}>
            <View style={styles.codeHeaderRow}>
              <View style={styles.codeIconWrap}>
                <Ionicons name="key-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.codeHeaderTitle}>Votre code secret de retrait</Text>
                <Text style={styles.codeHeaderSub}>À donner au commerçant sur place</Text>
              </View>
            </View>

            <View style={styles.codeDigitsBox}>
              <Text style={styles.codeDigitsText}>{order.pickupCode || "----"}</Text>
            </View>

            <Text style={styles.codeInstruction}>
              Rendez-vous à la boutique « {order.shop} ». Après avoir vérifié vos articles et payé le commerçant, transmettez-lui ce code pour finaliser la commande.
            </Text>

            {order.shopAddress && (
              <View style={styles.shopAddressRow}>
                <Ionicons name="location-outline" size={15} color={colors.primary} />
                <Text style={styles.shopAddressText}>{order.shopAddress}</Text>
              </View>
            )}
          </View>
        )}

        {/* Livraison Yango : redirection vers le service Livraison / Colis */}
        {accepted && !completed && yango && (
          <View style={styles.card}>
            <View style={styles.yangoHeaderRow}>
              <View style={styles.yangoIconWrap}>
                <Ionicons name="cube-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.stepTitle}>Livraison de votre colis</Text>
                <Text style={styles.stepSub}>
                  {order.driverDispatched
                    ? "Votre livreur est en route vers la boutique. Le commerçant lui remettra votre colis."
                    : "La boutique a validé votre commande. Ouvrez l'application Yango pour réserver votre livreur de colis."}
                </Text>
              </View>
            </View>

            <View style={styles.addressesBox}>
              <View style={styles.addressLine}>
                <Ionicons name="storefront-outline" size={16} color={colors.primary} />
                <View style={styles.flex}>
                  <Text style={styles.addressLabel}>Départ (Boutique) :</Text>
                  <Text style={styles.addressValue}>{order.shopAddress || `Boutique ${order.shop}`}</Text>
                </View>
              </View>

              <View style={styles.addressDivider} />

              <View style={styles.addressLine}>
                <Ionicons name="location-outline" size={16} color={colors.open} />
                <View style={styles.flex}>
                  <Text style={styles.addressLabel}>Arrivée (Votre adresse) :</Text>
                  <Text style={styles.addressValue}>{order.customerAddress || "Votre position de livraison"}</Text>
                </View>
              </View>
            </View>

            {!order.driverDispatched ? (
              <>
                <Button
                  label="Ouvrir Yango Livraison"
                  onPress={handleOpenYango}
                />

                <Text style={styles.yangoHint}>
                  💡 Dans Yango, veillez à bien sélectionner l'onglet « Livraison » (et non une course de taxi).
                </Text>

                <View style={styles.swipeWrap}>
                  <Text style={styles.swipePrompt}>
                    Une fois votre livreur commandé sur Yango :
                  </Text>
                  <SwipeButton
                    label="Glisser si le livreur est en route"
                    completedLabel="Livreur notifié au commerçant !"
                    variant="primary"
                    onSwipeComplete={async () => {
                      try {
                        const updated = await api.dispatchDriver(order.id);
                        setOrder(updated);
                      } catch (err) {
                        Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible de notifier l'envoi du livreur.");
                        throw err;
                      }
                    }}
                  />
                </View>
              </>
            ) : order.packageHandedOver ? (
              <View style={styles.dispatchedBanner}>
                <View style={styles.dispatchedHeader}>
                  <Ionicons name="cube" size={20} color={colors.open} />
                  <Text style={styles.dispatchedTitle}>Colis remis au livreur Yango !</Text>
                </View>
                <Text style={styles.dispatchedText}>
                  Le commerçant a confié vos articles au livreur. La livraison vers votre adresse est en cours d'acheminement.
                </Text>
                <Button
                  label="Suivre la course sur Yango"
                  variant="secondary"
                  onPress={handleOpenYango}
                />
              </View>
            ) : (
              <View style={styles.dispatchedBanner}>
                <View style={styles.dispatchedHeader}>
                  <Ionicons name="bicycle" size={20} color={colors.open} />
                  <Text style={styles.dispatchedTitle}>Livreur en route vers la boutique</Text>
                </View>
                <Text style={styles.dispatchedText}>
                  Le commerçant a été notifié. Il remettra votre colis au livreur dès son arrivée.
                </Text>
                <Button
                  label="Rouvrir l'application Yango"
                  variant="secondary"
                  onPress={handleOpenYango}
                />
              </View>
            )}
          </View>
        )}

        {/* Annulation de la commande côté client */}
        {canCancel && (
          <View style={styles.cancelCard}>
            <Text style={styles.cancelText}>
              {order.status === "pending"
                ? "Le commerçant n'a pas encore validé. Vous pouvez annuler votre commande sans frais."
                : order.driverDispatched
                  ? "Votre livreur a été notifié. Vous pouvez encore annuler tant que le commerçant n'a pas remis le colis."
                  : "Vous pouvez annuler cette commande tant que le colis n'a pas été remis au livreur."}
            </Text>
            <Button
              label={cancelling ? "Annulation en cours…" : "Annuler la commande"}
              variant="danger"
              icon="close-circle-outline"
              disabled={cancelling}
              onPress={handleCancelOrder}
            />
          </View>
        )}

        {/* Commande terminée */}
        {completed && (
          <View style={styles.completedCard}>
            <Ionicons name="checkmark-circle" size={40} color={colors.open} />
            <Text style={styles.completedTitle}>
              {yango ? "Commande livrée !" : "Commande retirée avec succès !"}
            </Text>
            <Text style={styles.completedSub}>
              La transaction s'est bien terminée. Merci pour votre confiance !
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  notFound: { fontFamily: fonts.medium, color: colors.textMuted, padding: spacing.lg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  topTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  content: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  shop: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  total: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  stepRow: { flexDirection: "row", gap: spacing.md },
  rail: { alignItems: "center" },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  circleDone: { backgroundColor: colors.open, borderColor: colors.open },
  circleCurrent: { backgroundColor: colors.primary, borderColor: colors.primary },
  circleError: { backgroundColor: colors.danger, borderColor: colors.danger },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
  line: { width: 2, flex: 1, minHeight: 28, backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.open },
  stepText: { flex: 1, paddingBottom: spacing.md, gap: 2 },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  stepTodo: { color: colors.textMuted },
  stepSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  warning: {
    backgroundColor: "#FFF6E5",
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  warningTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  warningText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  pickupCodeCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: spacing.md,
    gap: spacing.sm,
  },
  codeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  codeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  codeHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  codeHeaderSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  codeDigitsBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  codeDigitsText: {
    fontFamily: fonts.bold,
    fontSize: 32,
    letterSpacing: 8,
    color: colors.primary,
  },
  codeInstruction: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  shopAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  shopAddressText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
  yangoHeaderRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  yangoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  addressesBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 8,
    marginVertical: 4,
  },
  addressLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  addressDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  yangoHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
  swipeWrap: {
    gap: spacing.xs,
    marginTop: 4,
  },
  swipePrompt: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
  dispatchedBanner: {
    backgroundColor: colors.openSurface,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.open,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dispatchedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dispatchedTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.open,
    flex: 1,
  },
  dispatchedText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
  },
  completedCard: {
    backgroundColor: colors.openSurface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.open,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  completedTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.open,
    textAlign: "center",
  },
  completedSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    textAlign: "center",
    lineHeight: 18,
  },
  refusedCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.danger,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  refusedIconWrap: {
    marginBottom: spacing.xs,
  },
  refusedTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.danger,
    textAlign: "center",
  },
  refusedText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  cancelCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  cancelText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  flex: { flex: 1 },
});