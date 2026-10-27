import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import Chip from "../../components/Chip";
import { categories } from "../../data/articles";
import { extractFromSpeech, improvePhoto, suggestCategory } from "../../services/ai";
import { useArticles } from "../../store/ArticlesContext";
import { colors, fonts, radius, spacing } from "../../theme";


const choices = categories.filter((c) => c !== "Tout");

export default function NouvelArticle() {
  const router = useRouter();
  const { addArticle } = useArticles();
  const scrollRef = useRef<ScrollView>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [improved, setImproved] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [manualCategory, setManualCategory] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Suggestion de catégorie 0,5 s après la dernière lettre tapée
  useEffect(() => {
    if (manualCategory || title.trim().length < 3) return;
    const timer = setTimeout(async () => {
      const suggestion = await suggestCategory(title);
      if (suggestion) setCategory(suggestion.category);
    }, 500);
    return () => clearTimeout(timer);
  }, [title, manualCategory]);

  async function pickPhoto(source: "camera" | "gallery") {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.5,
      allowsEditing: true,
      aspect: [1, 1],
    };

    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Caméra refusée", "Autorisez la caméra pour photographier votre article.");
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }
    if (result.canceled) return;

    setPhotoUri(result.assets[0].uri);
    setImproved(false);
    setImproving(true);
    const better = await improvePhoto(result.assets[0].uri);
    setPhotoUri(better);
    setImproving(false);
    setImproved(true);
  }

  // SIMULATION de la dictée : la vraie voix arrive à l'étape 7
  function dictate() {
    const sample = "Je vends ce sac à 15 000 francs, le prix est à débattre";
    setTranscript(sample);
    const result = extractFromSpeech(sample);
    if (result.price !== null) setPrice(String(result.price));
    setNegotiable(result.negotiable);
  }

  const canPublish = title.trim().length > 0 && Number(price) > 0 && category !== "";

    async function publish() {
    if (publishing) return;
    setPublishing(true);
    const ok = await addArticle({
      name: title.trim(),
      price: Number(price),
      category,
      negotiable,
      color: "#B9854A",
      localPhotoUri: photoUri ?? undefined,
    });
    if (ok) router.back();
    else setPublishing(false);
  }

    return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Nouvel article</Text>
          <View style={styles.ai}>
            <Ionicons name="sparkles" size={12} color={colors.primary} />
            <Text style={styles.aiText}>IA</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.photoCard}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="camera-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyText}>Photographiez votre article</Text>
              </View>
            )}
            {improving && <Text style={styles.status}>L'IA améliore la photo…</Text>}
            {improved && (
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={12} color={colors.open} />
                <Text style={styles.badgeText}>Fond retiré · produit recentré</Text>
              </View>
            )}
          </View>

          <View style={styles.photoButtons}>
            <View style={styles.flex}>
              <Button label="Photo" icon="camera" onPress={() => pickPhoto("camera")} />
            </View>
            <View style={styles.flex}>
              <Button
                label="Galerie"
                icon="images-outline"
                variant="secondary"
                onPress={() => pickPhoto("gallery")}
              />
            </View>
          </View>

          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.field}
            placeholder="Ex. : Sac à main en cuir marron"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.chips}>
            {choices.map((c) => (
              <Chip
                key={c}
                label={c}
                active={c === category}
                onPress={() => {
                  setCategory(c);
                  setManualCategory(true);
                }}
              />
            ))}
          </View>

          <Pressable style={styles.voice} onPress={dictate}>
            <View style={styles.mic}>
              <Ionicons name="mic" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.voiceTitle}>Dictez les détails</Text>
              <Text style={styles.voiceText}>
                {transcript || "Touchez le micro (simulation)"}
              </Text>
            </View>
          </Pressable>

          <Text style={styles.label}>Prix (FCFA)</Text>
          <TextInput
            style={styles.field}
            placeholder="15000"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={price}
            onChangeText={(text) => setPrice(text.replace(/\D/g, ""))}
            onFocus={() =>
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)
            }
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Prix à débattre</Text>
            <Switch
              value={negotiable}
              onValueChange={setNegotiable}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
            <Button
                label={publishing ? "Publication…" : "Publier l'article"}
                disabled={!canPublish || publishing}
                onPress={publish}
            />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
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
  headerTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  ai: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  aiText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  content: { padding: spacing.lg, gap: spacing.sm },
  photoCard: {
    height: 240,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  empty: { alignItems: "center", gap: spacing.sm },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  status: {
    position: "absolute",
    bottom: 12,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  photoButtons: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
  field: {
    height: 50,
    backgroundColor: colors.card,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  voice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  mic: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  voiceText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  switchLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  footer: { padding: spacing.lg, backgroundColor: colors.background },
});