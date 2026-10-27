import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../../components/Button";
import { api, Order } from "../../../services/api";
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
  const now = useNow(5000);
  const [order, setOrder] = useState<Order | null>(null);
  const [failed, setFailed] = useState(false);

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
  const refused = order.status === "refused";
  const silent = order.status === "pending" && now - order.createdAt > ORDER_TIMEOUT_MS;
  const yango = order.mode === "yango";

  const steps: Step[] = [
    { title: "Commande envoyée", subtitle: timeAgo(order.createdAt), state: "done" },
    refused
      ? { title: "Refusée par le commerçant", state: "error" }
      : {
          title: accepted ? "Acceptée par le commerçant" : "En attente du commerçant",
          state: accepted ? "done" : "current",
        },
    { title: yango ? "Livraison Yango" : "Prête au retrait", state: accepted ? "current" : "todo" },
    { title: yango ? "Livrée" : "Retirée en boutique", state: "todo" },
  ];
  const visible = refused ? steps.slice(0, 2) : steps;

  const firstWord = order.items[0].article.name.split(" ")[0];

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

        {accepted && yango && (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>Votre livraison</Text>
            <Text style={styles.stepSub}>
              Ouvrez Yango pour commander la course. Les adresses seront pré-remplies dans une version suivante.
            </Text>
            <Button
              label="Ouvrir Yango"
              icon="car-outline"
              onPress={() => Linking.openURL("https://yango.com")}
            />
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
});