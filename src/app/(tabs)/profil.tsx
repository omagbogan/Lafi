import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { useOrders } from "../../store/OrdersContext";
import { colors, fonts, spacing } from "../../theme";

export default function Profil() {
  const router = useRouter();
  const { orders, lastOrderId, refreshOrders } = useOrders();
  const pending = orders.filter((o) => o.status === "pending").length;

  useFocusEffect(
    useCallback(() => {
      refreshOrders();
    }, [refreshOrders]),
  );

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Profil</Text>

      <Text style={styles.section}>Client</Text>
      <View style={styles.actions}>
        {lastOrderId ? (
          <Button
            label="Suivre ma dernière commande"
            icon="receipt-outline"
            variant="secondary"
            onPress={() => router.push({ pathname: "/commande/suivi/[id]", params: { id: lastOrderId } })}
          />
        ) : (
          <Text style={styles.hint}>Vous n'avez pas encore passé de commande.</Text>
        )}
      </View>

      <Text style={styles.section}>Espace commerçant</Text>
      <View style={styles.actions}>
        <Button
          label="Ma boutique"
          icon="storefront-outline"
          variant="secondary"
          onPress={() => router.push("/commercant/boutique")}
        />
        <Button
          label={pending > 0 ? `Commandes (${pending})` : "Commandes"}
          icon="notifications-outline"
          variant="secondary"
          onPress={() => router.push("/commercant/commandes")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text },
  section: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginTop: spacing.lg },
  actions: { marginTop: spacing.sm, gap: spacing.sm },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
});