/**
 * src/app/commercant/nouvel-article.tsx
 * -------------------------------------
 * Écran de publication express d'un article par le commerçant (< 1 minute).
 *
 * Soutenance Développeur Data IA (Bloc 2 - Entraînement, Bloc 3 - Application & Bloc 5 - Intégration) :
 * - Prise de vue & Traitement d'image IA : capture caméra ou galerie puis amélioration serveur
 *   Pillow (cadrage carré, netteté, autocontraste).
 * - Classification multimodale instantanée :
 *   - MobileNetV2 classe la photo dès la sélection.
 *   - Le classifieur texte analyse le titre tapé en temps réel (débouncing 500 ms).
 *   - L'algorithme de fusion multimodale compare les deux sources et informe le commerçant.
 * - Rédaction assistée par IA générative : génération d'une description commerciale captivante
 *   en un tap via l'agent LLM OpenRouter (Llama 3.3) avec repli local.
 */

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { type ElementRef, useEffect, useRef, useState } from "react";
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
import {
  generateDescription,
  improvePhoto,
  resolveMultimodalCategory,
  suggestCategory,
  suggestCategoryFromImage,
} from "../../services/ai";
import { useArticles } from "../../store/ArticlesContext";
import { colors, fonts, radius, spacing } from "../../theme";


const choices = categories.filter((c) => c !== "Tout");

export default function NouvelArticle() {
  const router = useRouter();
  const { addArticle } = useArticles();
  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [improving, setImproving] = useState(false);
  const [improved, setImproved] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [descSource, setDescSource] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [manualCategory, setManualCategory] = useState(false);
  const [textCategory, setTextCategory] = useState<string | null>(null);
  const [imageCategory, setImageCategory] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [analyzingText, setAnalyzingText] = useState(false);
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Suggestion de catégorie par le titre 0,5 s après la dernière lettre tapée
  useEffect(() => {
    if (title.trim().length < 3) {
      setTextCategory(null);
      return;
    }
    setAnalyzingText(true);
    const timer = setTimeout(async () => {
      try {
        const suggestion = await suggestCategory(title);
        const found = suggestion?.category ?? null;
        setTextCategory(found);
        if (!manualCategory && found) {
          const fusion = resolveMultimodalCategory(found, imageCategory);
          if (fusion.selectedCategory) setCategory(fusion.selectedCategory);
        }
      } finally {
        setAnalyzingText(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [title, manualCategory, imageCategory]);

  async function pickPhoto(source: "camera" | "gallery") {
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Caméra refusée", "Autorisez la caméra pour photographier votre article.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.6,
        allowsEditing: true,
        aspect: [1, 1],
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.6,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });
    }
    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const newUris = result.assets.map((a) => a.uri);
    const wasEmpty = photos.length === 0;
    const combined = [...photos, ...newUris].slice(0, 5);
    setPhotos(combined);
    setActivePhotoIdx(combined.length - 1);

    // Détection automatique de la catégorie par le modèle d'images (MobileNetV2) sur la première photo
    if (wasEmpty && newUris.length > 0) {
      const firstUri = newUris[0];
      setImproved(false);
      setImproving(true);
      setAnalyzingImage(true);

      suggestCategoryFromImage(firstUri)
        .then((suggestion) => {
          const found = suggestion?.category ?? null;
          setImageCategory(found);
          if (!manualCategory && found) {
            const fusion = resolveMultimodalCategory(textCategory, found);
            if (fusion.selectedCategory) setCategory(fusion.selectedCategory);
          }
        })
        .finally(() => {
          setAnalyzingImage(false);
        });

      improvePhoto(firstUri)
        .then((better) => {
          setPhotos((prev) => {
            const next = [...prev];
            next[0] = better;
            return next;
          });
          setImproved(true);
        })
        .finally(() => {
          setImproving(false);
        });
    }
  }

  function removePhoto(idxToRemove: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idxToRemove));
    if (activePhotoIdx >= idxToRemove && activePhotoIdx > 0) {
      setActivePhotoIdx(activePhotoIdx - 1);
    }
  }

  async function handleGenerateDescription() {
    if (title.trim().length < 2) {
      Alert.alert("Titre manquant", "Saisissez d'abord le titre de l'article pour générer sa description.");
      return;
    }
    setGeneratingDesc(true);
    try {
      const res = await generateDescription({
        title: title.trim(),
        category: category || undefined,
        price: Number(price) > 0 ? Number(price) : undefined,
        negotiable,
      });
      setDescription(res.description);
      setDescSource(res.source);
    } finally {
      setGeneratingDesc(false);
    }
  }

  const canPublish =
    title.trim().length > 0 &&
    Number(price) > 0 &&
    category !== "" &&
    photos.length >= 3;

  async function publish() {
    if (publishing) return;
    if (photos.length < 3) {
      Alert.alert(
        "Photos insuffisantes",
        `Veuillez ajouter au moins 3 photos pour votre article (${photos.length}/3 actuellement).`,
      );
      return;
    }
    setPublishing(true);
    const ok = await addArticle({
      name: title.trim(),
      price: Number(price),
      category,
      description: description.trim() || undefined,
      negotiable,
      color: "#B9854A",
      localPhotoUri: photos[0],
      localPhotoUris: photos,
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
          {/* Aperçu photo principale */}
          <View style={styles.photoCard}>
            {photos.length > 0 && photos[activePhotoIdx] ? (
              <Image source={{ uri: photos[activePhotoIdx] }} style={styles.photo} resizeMode="contain" />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="camera-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyText}>Ajoutez au moins 3 photos de votre article</Text>
              </View>
            )}
            {improving && <Text style={styles.status}>L'IA améliore et recadre la photo principale…</Text>}
            {improved && (
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={12} color={colors.open} />
                <Text style={styles.badgeText}>Photo principale optimisée par l'IA</Text>
              </View>
            )}
          </View>

          {/* Grille des 3 photos minimum */}
          <View style={styles.slotsRow}>
            {[0, 1, 2].map((idx) => {
              const uri = photos[idx];
              const isSelected = activePhotoIdx === idx && Boolean(uri);
              return (
                <View key={idx} style={styles.slotWrapper}>
                  {uri ? (
                    <Pressable
                      style={[styles.slotCard, isSelected && styles.slotCardSelected]}
                      onPress={() => setActivePhotoIdx(idx)}
                    >
                      <Image source={{ uri }} style={styles.slotImage} resizeMode="cover" />
                      <Pressable
                        style={styles.deletePhotoBtn}
                        onPress={() => removePhoto(idx)}
                        hitSlop={6}
                        accessibilityLabel={`Supprimer la photo ${idx + 1}`}
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </Pressable>
                      <View style={styles.slotBadge}>
                        <Text style={styles.slotBadgeText}>{idx + 1}</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.slotCardEmpty}
                      onPress={() => pickPhoto("gallery")}
                    >
                      <Ionicons name="add" size={20} color={colors.primary} />
                      <Text style={styles.slotEmptyText}>Photo {idx + 1}</Text>
                      <Text style={styles.slotRequiredText}>Requis</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>

          {/* Indicateur de validation 3 photos */}
          <View
            style={[
              styles.requirementBadge,
              photos.length >= 3 ? styles.requirementBadgeOk : styles.requirementBadgeWarn,
            ]}
          >
            <Ionicons
              name={photos.length >= 3 ? "checkmark-circle" : "alert-circle-outline"}
              size={16}
              color={photos.length >= 3 ? colors.open : colors.danger}
            />
            <Text
              style={[
                styles.requirementText,
                { color: photos.length >= 3 ? colors.open : colors.danger },
              ]}
            >
              {photos.length >= 3
                ? `${photos.length} photos prêtes · Minimum de 3 atteint`
                : `${photos.length}/3 photo${photos.length > 1 ? "s" : ""} ajoutée${photos.length > 1 ? "s" : ""} · Minimum 3 requises`}
            </Text>
          </View>

          <View style={styles.photoButtons}>
            <View style={styles.flex}>
              <Button label="Prendre photo" icon="camera" onPress={() => pickPhoto("camera")} />
            </View>
            <View style={styles.flex}>
              <Button
                label="Choisir photos"
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

          <View style={styles.categoryLabelRow}>
            <Text style={styles.label}>Catégorie</Text>
            {manualCategory && (
              <Pressable
                onPress={() => {
                  setManualCategory(false);
                  const fusion = resolveMultimodalCategory(textCategory, imageCategory);
                  if (fusion.selectedCategory) setCategory(fusion.selectedCategory);
                }}
              >
                <Text style={styles.resetAi}>Réactiver l'IA</Text>
              </Pressable>
            )}
          </View>

          {analyzingImage || analyzingText ? (
            <View style={styles.aiNotice}>
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text style={styles.aiNoticeText}>Analyse IA en cours...</Text>
            </View>
          ) : (() => {
            const fusion = resolveMultimodalCategory(textCategory, imageCategory);
            if (fusion.status === "agreement") {
              return (
                <View style={styles.agreementBox}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.open} />
                  <Text style={styles.agreementText}>
                    Accord IA : photo et titre confirment « {fusion.selectedCategory} »
                  </Text>
                </View>
              );
            }
            if (fusion.status === "conflict") {
              return (
                <View style={styles.conflictBox}>
                  <View style={styles.conflictHeader}>
                    <Ionicons name="help-circle-outline" size={15} color={colors.primary} />
                    <Text style={styles.conflictTitle}>Arbitrage IA suggéré :</Text>
                  </View>
                  <View style={styles.conflictButtons}>
                    {fusion.imageCategory && (
                      <Pressable
                        style={[
                          styles.conflictBtn,
                          category === fusion.imageCategory && styles.conflictBtnActive,
                        ]}
                        onPress={() => {
                          setCategory(fusion.imageCategory!);
                          setManualCategory(true);
                        }}
                      >
                        <Ionicons
                          name="camera-outline"
                          size={13}
                          color={category === fusion.imageCategory ? "#FFFFFF" : colors.primary}
                        />
                        <Text
                          style={[
                            styles.conflictBtnText,
                            category === fusion.imageCategory && styles.conflictBtnTextActive,
                          ]}
                        >
                          Photo : {fusion.imageCategory}
                        </Text>
                      </Pressable>
                    )}
                    {fusion.textCategory && (
                      <Pressable
                        style={[
                          styles.conflictBtn,
                          category === fusion.textCategory && styles.conflictBtnActive,
                        ]}
                        onPress={() => {
                          setCategory(fusion.textCategory!);
                          setManualCategory(true);
                        }}
                      >
                        <Ionicons
                          name="text-outline"
                          size={13}
                          color={category === fusion.textCategory ? "#FFFFFF" : colors.primary}
                        />
                        <Text
                          style={[
                            styles.conflictBtnText,
                            category === fusion.textCategory && styles.conflictBtnTextActive,
                          ]}
                        >
                          Titre : {fusion.textCategory}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }
            if (fusion.status === "image_only" || fusion.status === "text_only") {
              return (
                <View style={styles.aiNotice}>
                  <Ionicons
                    name={fusion.status === "image_only" ? "camera-outline" : "text-outline"}
                    size={13}
                    color={colors.primary}
                  />
                  <Text style={styles.aiNoticeText}>{fusion.message}</Text>
                </View>
              );
            }
            return null;
          })()}

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

          {/* Générateur de description commerciale par IA */}
          <View style={styles.descHeaderRow}>
            <Text style={styles.label}>Description</Text>
            <Pressable
              style={({ pressed }) => [
                styles.aiGenerateBtn,
                pressed && styles.aiGenerateBtnPressed,
                generatingDesc && styles.aiGenerateBtnDisabled,
              ]}
              onPress={handleGenerateDescription}
              disabled={generatingDesc}
            >
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text style={styles.aiGenerateBtnText}>
                {generatingDesc ? "Rédaction IA…" : "Générer avec l'IA"}
              </Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.descField}
            placeholder="Décrivez votre article ou touchez « Générer avec l'IA »…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
          {descSource && description.trim().length > 0 && (
            <View style={styles.aiNotice}>
              <Ionicons name="sparkles" size={12} color={colors.primary} />
              <Text style={styles.aiNoticeText}>
                {descSource === "openrouter"
                  ? "Rédigé par l'IA Générative OpenRouter"
                  : "Rédigé par l'assistant Lafi"}
              </Text>
            </View>
          )}

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
            label={
              publishing
                ? "Publication…"
                : photos.length < 3
                  ? `Ajouter au moins 3 photos (${photos.length}/3)`
                  : "Publier l'article"
            }
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
  slotsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  slotWrapper: {
    flex: 1,
  },
  slotCard: {
    height: 84,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    position: "relative",
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  slotCardSelected: {
    borderColor: colors.primary,
  },
  slotCardEmpty: {
    height: 84,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    gap: 2,
  },
  slotImage: {
    width: "100%",
    height: "100%",
  },
  deletePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  slotBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  slotBadgeText: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  slotEmptyText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.text,
  },
  slotRequiredText: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.danger,
  },
  requirementBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  requirementBadgeOk: {
    backgroundColor: colors.openSurface,
  },
  requirementBadgeWarn: {
    backgroundColor: colors.surface,
  },
  requirementText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
  categoryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  resetAi: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
  aiNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    marginVertical: spacing.xs,
  },
  aiNoticeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
  agreementBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.open,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.field,
    marginVertical: spacing.xs,
  },
  agreementText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.open,
    flex: 1,
  },
  conflictBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.field,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    gap: 6,
  },
  conflictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  conflictTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
  },
  conflictButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  conflictBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  conflictBtnActive: {
    backgroundColor: colors.primary,
  },
  conflictBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
  conflictBtnTextActive: {
    color: "#FFFFFF",
  },
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
  descHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  aiGenerateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  aiGenerateBtnPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  aiGenerateBtnDisabled: {
    opacity: 0.6,
  },
  aiGenerateBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  descField: {
    minHeight: 82,
    backgroundColor: colors.card,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: "top",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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