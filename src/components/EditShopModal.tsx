/**
 * src/components/EditShopModal.tsx
 * --------------------------------
 * Modale de modification des informations de la boutique (Commerçant).
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Pré-remplissage automatique des données existantes (nom, gérant, téléphone WhatsApp, adresse).
 * - Recalibrage GPS haute précision : bouton 'Position GPS exacte' pour mettre à jour les coordonnées
 *   lat/lng de la boutique indispensables pour l'itinéraire du livreur Yango.
 * - Validation stricte et mise à jour simultanée de la base de données distante et de l'état local.
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

type EditShopModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function EditShopModal({
  visible,
  onClose,
  onSuccess,
}: EditShopModalProps) {
  const { merchant, updateMerchant } = useAuth();
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [loading, setLoading] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-remplir les champs avec les données actuelles de la boutique
  useEffect(() => {
    if (visible && merchant) {
      setShopName(merchant.shopName || "");
      setOwnerName(merchant.ownerName || "");
      setEmail(merchant.email || "");
      setPhone(merchant.phone || "");
      setAddress(merchant.address || "");
      setCoords({ lat: merchant.lat, lng: merchant.lng });
      setError(null);
    }
  }, [visible, merchant]);

  async function handleDetectLocation() {
    setDetectingLoc(true);
    try {
      const res = await getCurrentAddress();
      if (res) {
        setAddress(res.addressText);
        setCoords({ lat: res.latitude, lng: res.longitude });
      }
    } finally {
      setDetectingLoc(false);
    }
  }

  async function handleSave() {
    setError(null);
    const cleanShopName = shopName.trim();
    const cleanOwnerName = ownerName.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();

    if (!cleanShopName) {
      const msg = "Veuillez renseigner le nom de la boutique.";
      setError(msg);
      Alert.alert("Nom de boutique requis", msg);
      return;
    }

    if (!cleanOwnerName) {
      const msg = "Veuillez renseigner le nom du propriétaire ou gérant.";
      setError(msg);
      Alert.alert("Nom de gérant requis", msg);
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      const msg = "Veuillez renseigner un numéro de téléphone valide (au moins 8 chiffres).";
      setError(msg);
      Alert.alert("Téléphone invalide", msg);
      return;
    }

    if (!cleanAddress) {
      const msg = "Veuillez renseigner l'adresse ou le quartier de la boutique.";
      setError(msg);
      Alert.alert("Adresse requise", msg);
      return;
    }

    setLoading(true);
    try {
      await updateMerchant({
        shopName: cleanShopName,
        ownerName: cleanOwnerName,
        email: email.trim().toLowerCase() || undefined,
        phone: cleanPhone,
        address: cleanAddress,
        lat: coords.lat,
        lng: coords.lng,
      });
      Alert.alert(
        "Boutique mise à jour",
        "Les informations de votre boutique ont été enregistrées avec succès.",
      );
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Une erreur est survenue lors de la mise à jour de la boutique.",
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
              <Text style={styles.title}>Modifier ma boutique</Text>
              <Text style={styles.subtitle}>
                Informations visibles par vos clients et utilisées par les livreurs Yango.
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
            {/* Nom de la boutique */}
            <View style={styles.field}>
              <Text style={styles.label}>Nom de la boutique</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: Chez Aïcha Mode"
                placeholderTextColor={colors.textMuted}
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            {/* Nom du propriétaire / gérant */}
            <View style={styles.field}>
              <Text style={styles.label}>Nom du propriétaire / gérant</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: Aïcha Ouattara"
                placeholderTextColor={colors.textMuted}
                value={ownerName}
                onChangeText={setOwnerName}
                autoCapitalize="words"
              />
            </View>

            {/* Adresse email */}
            <View style={styles.field}>
              <Text style={styles.label}>Adresse email de la boutique</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: contact@maboutique.ci"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Téléphone WhatsApp */}
            <View style={styles.field}>
              <Text style={styles.label}>Téléphone WhatsApp de la boutique</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: 0701020304"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.helperText}>
                Numéro contacté par les clients et les livreurs.
              </Text>
            </View>

            {/* Adresse & GPS */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Quartier & Adresse de la boutique</Text>
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
                    {detectingLoc ? "Localisation..." : "Position GPS exacte"}
                  </Text>
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="ex: Cocody Blockhaus, face à l'école primaire"
                placeholderTextColor={colors.textMuted}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
              />
              <View style={styles.gpsStatusRow}>
                <Ionicons
                  name={coords.lat ? "checkmark-circle" : "alert-circle-outline"}
                  size={14}
                  color={coords.lat ? colors.open : colors.textMuted}
                />
                <Text style={styles.gpsStatusText}>
                  {coords.lat && coords.lng
                    ? `Coordonnées GPS actives (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) pour le départ Yango`
                    : "Coordonnées GPS par défaut (Abidjan)"}
                </Text>
              </View>
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
    maxHeight: "88%",
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
  gpsStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  gpsStatusText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  actions: {
    marginTop: spacing.sm,
  },
});

