import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { getCurrentAddress } from "../../services/location";
import { useAuth } from "../../store/AuthContext";
import { colors, fonts, radius, shadows, spacing } from "../../theme";

export default function InscriptionCommercant() {
  const router = useRouter();
  const {
    registerMerchant,
    loginMerchant,
    forgotPassword,
    resetPassword,
    sendEmailVerificationCode,
    verifyEmailCode,
  } = useAuth();
  const [mode, setMode] = useState<"register" | "login" | "forgot">("login");
  const [ownerName, setOwnerName] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État vérification email à l'inscription
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [verifyCode, setVerifyCode] = useState("");

  // États pour "Mot de passe oublié"
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

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

  async function handleSubmit() {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      const msg = "Veuillez saisir une adresse email valide.";
      setError(msg);
      Alert.alert("Email invalide", msg);
      return;
    }

    if (mode === "login") {
      if (!password) {
        const msg = "Veuillez saisir votre mot de passe.";
        setError(msg);
        Alert.alert("Mot de passe requis", msg);
        return;
      }

      setLoading(true);
      try {
        await loginMerchant({ email: cleanEmail, password });
        router.replace("/(tabs)");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Adresse email ou mot de passe incorrect.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "register") {
      if (!ownerName.trim()) {
        const msg = "Veuillez indiquer votre nom complet (propriétaire).";
        setError(msg);
        Alert.alert("Nom requis", msg);
        return;
      }
      if (!shopName.trim()) {
        const msg = "Veuillez indiquer le nom commercial de votre boutique.";
        setError(msg);
        Alert.alert("Nom de boutique requis", msg);
        return;
      }
      const cleanPhone = phone.trim();
      if (!cleanPhone || cleanPhone.length < 8) {
        const msg = "Veuillez saisir un numéro de téléphone valide (WhatsApp / contact).";
        setError(msg);
        Alert.alert("Numéro incomplet", msg);
        return;
      }
      if (!address.trim()) {
        const msg = "Veuillez indiquer l'adresse ou le quartier de votre boutique.";
        setError(msg);
        Alert.alert("Adresse requise", msg);
        return;
      }
      if (!password || password.length < 6) {
        const msg = "Le mot de passe doit comporter au moins 6 caractères.";
        setError(msg);
        Alert.alert("Mot de passe trop court", msg);
        return;
      }

      setLoading(true);
      try {
        await sendEmailVerificationCode(cleanEmail, ownerName.trim());
        setRegisterStep(2);
        Alert.alert(
          "Code envoyé !",
          `Un code de confirmation à 6 chiffres a été envoyé à ${cleanEmail}.`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Impossible d'envoyer le code de confirmation.");
      } finally {
        setLoading(false);
      }
    }
  }

  // Étape 2 inscription : validation du code email et ouverture de la boutique
  async function handleConfirmMerchantRegistration() {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = verifyCode.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      const msg = "Le code de confirmation doit comporter exactement 6 chiffres.";
      setError(msg);
      Alert.alert("Code invalide", msg);
      return;
    }

    setLoading(true);
    try {
      await verifyEmailCode(cleanEmail, cleanCode);
      await registerMerchant({
        ownerName: ownerName.trim(),
        shopName: shopName.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        address: address.trim(),
        password,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code de confirmation incorrect.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendRegisterCode() {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      await sendEmailVerificationCode(cleanEmail, ownerName.trim());
      Alert.alert(
        "Nouveau code envoyé !",
        `Un nouveau code à 6 chiffres a été envoyé à ${cleanEmail}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du renvoi du code.");
    } finally {
      setLoading(false);
    }
  }

  // Étape 1 mot de passe oublié : demande de code
  async function handleSendResetCode() {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Veuillez renseigner votre adresse email boutique.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(cleanEmail, "merchant");
      setForgotStep(2);
      Alert.alert(
        "Code envoyé !",
        `Un code de sécurité à 6 chiffres a été envoyé à ${cleanEmail}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'envoyer le code.");
    } finally {
      setLoading(false);
    }
  }

  // Étape 2 mot de passe oublié : validation du code et changement de mot de passe
  async function handleConfirmResetPassword() {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = resetCode.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setError("Le code doit comporter exactement 6 chiffres.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Le nouveau mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(cleanEmail, cleanCode, newPassword, "merchant");
      Alert.alert(
        "Succès !",
        "Le mot de passe de votre boutique a été modifié. Vous pouvez vous connecter.",
        [
          {
            text: "Se connecter",
            onPress: () => {
              setMode("login");
              setPassword(newPassword);
              setForgotStep(1);
            },
          },
        ],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code incorrect ou expiré.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.topTitle}>
            {mode === "forgot" ? "Mot de passe oublié" : "Espace Commerçant"}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header intro */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={
                  mode === "forgot"
                    ? "key-outline"
                    : mode === "register" && registerStep === 2
                      ? "mail-unread-outline"
                      : "storefront"
                }
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={styles.title}>
              {mode === "forgot"
                ? "Récupération d'accès"
                : mode === "register"
                  ? registerStep === 2
                    ? "Vérification email"
                    : "Rejoindre le réseau Lafi"
                  : "Connexion Boutique"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "forgot"
                ? forgotStep === 1
                  ? "Entrez l'email de votre boutique pour recevoir votre code."
                  : "Saisissez le code reçu et définissez votre nouveau mot de passe."
                : mode === "register"
                  ? registerStep === 2
                    ? "Confirmez votre adresse email pour finaliser la création de votre boutique."
                    : "Créez votre boutique en 1 minute et commencez à vendre aux clients à proximité."
                  : "Accédez à votre tableau de bord, vos articles et vos commandes reçues."}
            </Text>
          </View>

          {/* Onglets Connexion / Inscription (masqués si mode forgot ou validation email) */}
          {mode !== "forgot" && registerStep === 1 && (
            <View style={styles.segment}>
              <Pressable
                style={[styles.segBtn, mode === "login" && styles.segBtnActive]}
                onPress={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                <Text style={[styles.segText, mode === "login" && styles.segTextActive]}>
                  Connexion
                </Text>
              </Pressable>

              <Pressable
                style={[styles.segBtn, mode === "register" && styles.segBtnActive]}
                onPress={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                <Text style={[styles.segText, mode === "register" && styles.segTextActive]}>
                  Créer ma boutique
                </Text>
              </Pressable>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Mode Mot de passe oublié */}
          {mode === "forgot" ? (
            forgotStep === 1 ? (
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Adresse email de la boutique</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ex: boutique@lafi.ci"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.submitWrap}>
                  <Button
                    label={loading ? "Envoi du code..." : "Envoyer le code de réinitialisation"}
                    disabled={loading}
                    onPress={handleSendResetCode}
                  />
                </View>

                <Pressable
                  style={styles.switchModeBtn}
                  onPress={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  <Text style={styles.switchModeText}>
                    Retour à la connexion boutique
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Code de vérification (6 chiffres)</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="••••••"
                    placeholderTextColor={colors.textMuted}
                    value={resetCode}
                    onChangeText={setResetCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Nouveau mot de passe</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Au moins 6 caractères"
                      placeholderTextColor={colors.textMuted}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      style={styles.eyeBtn}
                      onPress={() => setShowNewPassword((prev) => !prev)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.submitWrap}>
                  <Button
                    label={loading ? "Modification..." : "Valider le nouveau mot de passe"}
                    disabled={loading}
                    onPress={handleConfirmResetPassword}
                  />
                </View>

                <Pressable
                  style={styles.switchModeBtn}
                  onPress={() => setForgotStep(1)}
                >
                  <Text style={styles.switchModeText}>
                    Renvoyer un code / Changer d'email
                  </Text>
                </Pressable>
              </View>
            )
          ) : mode === "register" && registerStep === 2 ? (
            /* Étape 2 Inscription : Confirmation du code Email */
            <View style={styles.form}>
              <View style={styles.emailVerifyBox}>
                <Ionicons name="mail-unread-outline" size={36} color={colors.primary} />
                <Text style={styles.emailVerifyTitle}>Confirmez votre adresse email</Text>
                <Text style={styles.emailVerifySub}>
                  Un code de confirmation à 6 chiffres a été envoyé à{"\n"}
                  <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{email.trim()}</Text>
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Code de confirmation (6 chiffres)</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="••••••"
                  placeholderTextColor={colors.textMuted}
                  value={verifyCode}
                  onChangeText={setVerifyCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <View style={styles.submitWrap}>
                <Button
                  label={loading ? "Vérification..." : "Confirmer et ouvrir ma boutique"}
                  disabled={loading}
                  onPress={handleConfirmMerchantRegistration}
                />
              </View>

              <Pressable
                style={styles.switchModeBtn}
                onPress={handleResendRegisterCode}
                disabled={loading}
              >
                <Text style={styles.switchModeText}>
                  Renvoyer le code
                </Text>
              </Pressable>

              <Pressable
                style={styles.switchModeBtn}
                onPress={() => setRegisterStep(1)}
                disabled={loading}
              >
                <Text style={[styles.switchModeText, { color: colors.textMuted }]}>
                  Modifier mes informations
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Mode Connexion ou Inscription (Étape 1) */
            <View style={styles.form}>
              {mode === "register" && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Nom complet du gérant / propriétaire</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ex: Kouassi Emmanuel"
                      placeholderTextColor={colors.textMuted}
                      value={ownerName}
                      onChangeText={setOwnerName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Nom commercial de la boutique</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ex: Chez Kouassi Fashion"
                      placeholderTextColor={colors.textMuted}
                      value={shopName}
                      onChangeText={setShopName}
                      autoCapitalize="words"
                    />
                  </View>
                </>
              )}

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
                  autoCorrect={false}
                />
              </View>

              {mode === "register" && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Numéro de téléphone (WhatsApp boutique)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ex: 0701020304"
                      placeholderTextColor={colors.textMuted}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.field}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Adresse ou quartier de la boutique</Text>
                      <Pressable
                        style={styles.gpsPill}
                        onPress={handleDetectLocation}
                        disabled={detectingLoc}
                        hitSlop={6}
                      >
                        <Ionicons
                          name={detectingLoc ? "hourglass-outline" : "navigate"}
                          size={13}
                          color={colors.primary}
                        />
                        <Text style={styles.gpsPillText}>
                          {detectingLoc ? "Localisation..." : "Position GPS"}
                        </Text>
                      </Pressable>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="ex: Marché de Treichville, Allée 4"
                      placeholderTextColor={colors.textMuted}
                      value={address}
                      onChangeText={setAddress}
                    />
                  </View>
                </>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>Mot de passe</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={
                      mode === "register"
                        ? "Au moins 6 caractères"
                        : "Votre mot de passe"
                    }
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              </View>

              {mode === "login" && (
                <Pressable
                  style={styles.forgotBtn}
                  onPress={() => {
                    setMode("forgot");
                    setForgotStep(1);
                    setError(null);
                  }}
                >
                  <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                </Pressable>
              )}

              <View style={styles.submitWrap}>
                <Button
                  label={
                    loading
                      ? "Chargement..."
                      : mode === "register"
                        ? "Ouvrir ma boutique sur Lafi"
                        : "Accéder à ma boutique"
                  }
                  disabled={loading}
                  onPress={handleSubmit}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 1.5,
  },
  header: {
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segBtnActive: {
    backgroundColor: colors.card,
    ...shadows.card,
  },
  segText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  segTextActive: {
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE4E2",
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  form: {
    gap: spacing.md,
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
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },
  input: {
    height: 48,
    backgroundColor: colors.card,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeInput: {
    textAlign: "center",
    letterSpacing: 6,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
  gpsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  gpsPillText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primary,
  },
  submitWrap: {
    marginTop: spacing.sm,
  },
  switchModeBtn: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  switchModeText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },
  emailVerifyBox: {
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginBottom: spacing.xs,
  },
  emailVerifyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
  },
  emailVerifySub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  demoNoteText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primary,
    textAlign: "center",
    marginTop: 2,
  },
});
