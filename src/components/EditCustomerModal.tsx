/**
 * src/components/EditCustomerModal.tsx
 * ------------------------------------
 * Modale de modification des informations personnelles du Client.
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Pré-remplissage des champs existants (nom, prénom, adresse de résidence habituelle).
 * - Détection GPS en un clic ('Position GPS') pour renseigner automatiquement le quartier.
 * - Sauvegarde instantanée sans forcer un code SMS OTP, avec synchronisation SQLite et AsyncStorage.
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getCurrentAddress } from "../services/location";
import { useAuth } from "../store/AuthContext";
import { colors, fonts, radius, shadows, spacing } from "../theme";
import Button from "./Button";

type EditCustomerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function EditCustomerModal({
  visible,
  onClose,
  onSuccess,
}: EditCustomerModalProps) {
  const { customer, updateCustomer } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-remplir les champs avec les données actuelles du client
  useEffect(() => {
    if (visible && customer) {
      setName(customer.name || "");
      setEmail(customer.email || "");
      setAddress(customer.address || "");
      setError(null);
    }
  }, [visible, customer]);

  async function handleDetectLocation() {
    setDetectingLoc(true);
    try {
      const res = await getCurrentAddress();
      if (res) {
        setAddress(res.addressText);
      }
    } finally {
      setDetectingLoc(false);
    }
  }

  async function handleSave() {
    setError(null);
    const cleanName = name.trim();
    const cleanAddress = address.trim();

    if (!cleanName) {
      const msg = "Veuillez renseigner votre nom complet.";
      setError(msg);
      Alert.alert("Nom requis", msg);
      return;
    }

    if (!cleanAddress) {
      const msg = "Veuillez renseigner votre adresse ou quartier de résidence.";
      setError(msg);
      Alert.alert("Adresse requise", msg);
      return;
    }

    setLoading(true);
    try {
      await updateCustomer({
        name: cleanName,
        address: cleanAddress,
        email: email.trim().toLowerCase() || undefined,
      });
      Alert.alert(
        "Profil mis à jour",
        "Vos informations ont été modifiées avec succès.",
      );
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Une erreur est survenue lors de la mise à jour.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <Text style={styles.title}>Modifier mes informations</Text>
              <Text style={styles.subtitle}>
                Mettez à jour vos coordonnées personnelles et de livraison.
              </Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            {/* Numéro de téléphone (lecture seule avec explication) */}
            <View style={styles.field}>
              <Text style={styles.label}>Numéro WhatsApp / Compte</Text>
              <View style={styles.readOnlyInputBox}>
                <Ionicons name="call-outline" size={18} color={colors.textMuted} />
                <Text style={styles.readOnlyText}>{customer?.phone || "—"}</Text>
              </View>
              <Text style={styles.helperText}>
                Ce numéro sert d'identifiant unique à votre compte Lafi.
              </Text>
            </View>

            {/* Nom & Prénom */}
            <View style={styles.field}>
              <Text style={styles.label}>Nom & Prénom</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: Awa Traoré"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Adresse Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Adresse email</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: awa@gmail.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Adresse / Quartier */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Quartier & Adresse de résidence</Text>
                <Pressable
                  style={styles.gpsPill}
                  onPress={handleDetectLocation}
                  disabled={detectingLoc}
                  hitSlop={6}
                >
                  <Ionicons
                    name="navigate"
                    size={12}
                    color={detectingLoc ? colors.textMuted : colors.primary}
                  />
                  <Text
                    style={[
                      styles.gpsPillText,
                      detectingLoc && styles.gpsPillTextDisabled,
                    ]}
                  >
                    {detectingLoc ? "Localisation..." : "Position GPS"}
                  </Text>
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="ex: Cocody Angré 8e Tranche, près de la pharmacie"
                placeholderTextColor={colors.textMuted}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
              />
              <Text style={styles.helperText}>
                Adresse par défaut utilisée pour vos livraisons.
              </Text>
            </View>

            <View style={styles.actions}>
              <Button
                label={loading ? "Enregistrement..." : "Enregistrer les modifications"}
                variant="primary"
                onPress={handleSave}
                disabled={loading}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: "85%",
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 34 : spacing.xl,
    ...shadows.card,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitles: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#FEE4E2",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.field,
    marginBottom: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  form: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  readOnlyInputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  readOnlyText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  gpsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  gpsPillText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primary,
  },
  gpsPillTextDisabled: {
    color: colors.textMuted,
  },
  actions: {
    marginTop: spacing.sm,
  },
});

