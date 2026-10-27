import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { colors, fonts, spacing } from "../../theme";

export default function Confirmation() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <View style={styles.circle}>
          <Ionicons name="checkmark" size={44} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Commande envoyée</Text>
        <Text style={styles.text}>
          Le commerçant a été prévenu. Suivez l'avancement de votre commande en temps réel.
        </Text>
      </View>
      <View style={styles.footer}>
        {id && (
          <Button
            label="Suivre ma commande"
            onPress={() => router.replace({ pathname: "/commande/suivi/[id]", params: { id } })}
          />
        )}
        <Button label="Retour à l'accueil" variant="secondary" onPress={() => router.replace("/")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.open,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  text: { textAlign: "center", fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  footer: { padding: spacing.lg, gap: spacing.sm },
});