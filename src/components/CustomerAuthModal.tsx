import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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

type CustomerAuthModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
};

export default function CustomerAuthModal({
  visible,
  onClose,
  onSuccess,
  title = "Compte Client",
  subtitle = "Connectez-vous pour finaliser votre commande.",
}: CustomerAuthModalProps) {
  const {
    registerCustomer,
    loginCustomer,
    forgotPassword,
    resetPassword,
    sendEmailVerificationCode,
    verifyEmailCode,
  } = useAuth();
  const [mode, setMode] = useState<"register" | "login" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectingLoc, setDetectingLoc] = useState(false);

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
      }
    } finally {
      setDetectingLoc(false);
    }
  }

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setPassword("");
    setShowPassword(false);
    setError(null);
    setLoading(false);
    setDetectingLoc(false);
    setMode("login");
    setRegisterStep(1);
    setVerifyCode("");
    setForgotStep(1);
    setResetCode("");
    setNewPassword("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      const msg = "Veuillez renseigner une adresse email valide.";
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
        await loginCustomer({ email: cleanEmail, password });
        resetForm();
        onSuccess();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Adresse email ou mot de passe incorrect.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        const msg = "Veuillez renseigner votre nom complet.";
        setError(msg);
        Alert.alert("Nom requis", msg);
        return;
      }
      const cleanP = phone.trim();
      if (!cleanP || cleanP.length < 8) {
        const msg = "Veuillez renseigner un numéro de téléphone valide (pour la livraison).";
        setError(msg);
        Alert.alert("Téléphone requis", msg);
        return;
      }
      if (!address.trim()) {
        const msg = "Veuillez indiquer votre quartier de livraison (ex: Cocody Palmeraie).";
        setError(msg);
        Alert.alert("Quartier requis", msg);
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
        await sendEmailVerificationCode(cleanEmail, name.trim());
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

  // Étape 2 inscription : validation du code email et création finale du compte
  async function handleConfirmRegistration() {
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
      await registerCustomer({
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        address: address.trim(),
        password,
      });
      resetForm();
      onSuccess();
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
      await sendEmailVerificationCode(cleanEmail, name.trim());
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
      setError("Veuillez renseigner votre adresse email.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(cleanEmail, "customer");
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
      await resetPassword(cleanEmail, cleanCode, newPassword, "customer");
      Alert.alert(
        "Succès !",
        "Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.",
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <Text style={styles.title}>
                {mode === "forgot"
                  ? "Mot de passe oublié"
                  : mode === "register" && registerStep === 2
                    ? "Vérification email"
                    : title}
              </Text>
              <Text style={styles.subtitle}>
                {mode === "forgot"
                  ? forgotStep === 1
                    ? "Recevez un code par email pour réinitialiser votre accès."
                    : "Entrez le code reçu et choisissez votre nouveau mot de passe."
                  : mode === "register" && registerStep === 2
                    ? "Confirmez votre adresse email pour activer votre compte."
                    : subtitle}
              </Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={handleClose}
              hitSlop={8}
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Onglets Connexion / Inscription (masqués en mode mot de passe oublié ou validation email) */}
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
                  Créer un compte
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

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            {/* Mode Mot de passe oublié */}
            {mode === "forgot" ? (
              forgotStep === 1 ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Votre adresse email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ex: awa@gmail.com"
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
                      Retour à la connexion
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
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
                </>
              )
            ) : mode === "register" && registerStep === 2 ? (
              /* Étape 2 Inscription : Confirmation du code Email */
              <>
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
                    label={loading ? "Vérification..." : "Valider mon inscription"}
                    disabled={loading}
                    onPress={handleConfirmRegistration}
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
              </>
            ) : (
              /* Mode Connexion ou Inscription (Étape 1) */
              <>
                {mode === "register" && (
                  <View style={styles.field}>
                    <Text style={styles.label}>Nom complet</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ex: Awa Traoré"
                      placeholderTextColor={colors.textMuted}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

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
                    autoCorrect={false}
                  />
                </View>

                {mode === "register" && (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>Numéro de téléphone (WhatsApp / Yango)</Text>
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
                        <Text style={styles.label}>Quartier de livraison</Text>
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
                            {detectingLoc ? "Localisation..." : "Ma position"}
                          </Text>
                        </Pressable>
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="ex: Riviera Palmeraie, Cocody"
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
                          ? "Créer mon compte client"
                          : "Se connecter"
                    }
                    disabled={loading}
                    onPress={handleSubmit}
                  />
                </View>
              </>
            )}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: "88%",
    ...shadows.card,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerTitles: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.md,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
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
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },
  input: {
    height: 48,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
    marginTop: spacing.xs,
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
