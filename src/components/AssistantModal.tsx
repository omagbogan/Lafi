/**
 * src/components/AssistantModal.tsx
 * ---------------------------------
 * Modale de l'Assistant Intelligent Lafi (Agent Conversationnel & Vision Multimodale).
 *
 * Soutenance Développeur Data IA (Bloc 4 - Agent IA & Bloc 5 - Intégration) :
 * - Recherche conversationnelle par texte : dialogue naturel avec filtrage strict anti-hors-sujet
 *   et mémoire multi-tours pour affiner la recherche (ex: 'Moins cher ?', 'En taille M ?').
 * - Recherche multimodale par photo : bouton caméra permettant d'envoyer la photo d'un objet
 *   pour que le modèle Vision LLM (OpenRouter) identifie l'article correspondant dans la base SQLite.
 * - Cartes articles interactives intégrées directement dans les bulles de réponse pour commander en 1 clic.
 * - Mode hybride résilient : bascule automatique sur le moteur local en cas de coupure internet.
 */

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { SafeAreaView } from "react-native-safe-area-context";
import type { Article } from "../data/articles";
import { api } from "../services/api";
import { colors, fonts, radius, shadows, spacing } from "../theme";
import { formatDistance, formatPrice } from "../utils/format";

type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  imageUri?: string;
  articles?: Article[];
  source?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const SUGGESTIONS = [
  "Un repas à moins de 3 000 F",
  "Accessoires téléphone pas chers",
  "Produits pour bébé",
  "Sac à main ou habits",
];

export default function AssistantModal({ visible, onClose }: Props) {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Bonjour ! Je suis l'assistant IA de Lafi. Dites-moi ce que vous recherchez (un plat, un habit, des écouteurs...) ou votre budget, et je vous trouve les articles disponibles près de chez vous !",
    },
  ]);

  async function sendMessage(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text,
    };

    const historyPayload = messages
      .filter((m) => m.id !== "welcome" && !m.id.startsWith("err-"))
      .slice(-4)
      .map((m) => ({
        role: m.sender,
        content: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.askAssistant(text, historyPayload);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: response.reply,
        articles: response.recommendedArticles,
        source: response.source,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: "Désolé, je n'ai pas pu contacter le catalogue pour le moment. Veuillez réessayer.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  async function launchImagePicker(source: "camera" | "gallery") {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    };

    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Caméra refusée", "Autorisez la caméra pour rechercher un produit par photo.");
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (result.canceled || !result.assets[0]?.uri) return;

    await sendImageMessage(result.assets[0].uri);
  }

  function handlePhotoOption() {
    if (loading) return;
    Alert.alert(
      "Recherche par photo",
      "Prenez une photo ou choisissez une image pour trouver le produit correspondant dans les boutiques :",
      [
        { text: "Appareil photo", onPress: () => launchImagePicker("camera") },
        { text: "Galerie d'images", onPress: () => launchImagePicker("gallery") },
        { text: "Annuler", style: "cancel" },
      ],
    );
  }

  async function sendImageMessage(uri: string) {
    const userMsg: ChatMessage = {
      id: `u-img-${Date.now()}`,
      sender: "user",
      text: "Recherche de ce produit 📷",
      imageUri: uri,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await api.askAssistantWithImage(uri);
      const aiMsg: ChatMessage = {
        id: `ai-img-${Date.now()}`,
        sender: "assistant",
        text: response.reply,
        articles: response.recommendedArticles,
        source: response.source,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: "Désolé, je n'ai pas pu analyser la photo pour le moment. Veuillez réessayer ou décrire votre produit.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleArticlePress(articleId: string) {
    onClose();
    router.push({ pathname: "/article/[id]", params: { id: articleId } });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Assistant Lafi</Text>
              <Text style={styles.headerSubtitle}>Intelligence locale · Cocody</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
            onPress={onClose}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* Suggestions rapides */}
        <View style={styles.suggestionsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsList}>
            {SUGGESTIONS.map((item) => (
              <Pressable
                key={item}
                style={({ pressed }) => [styles.suggestionChip, pressed && styles.chipPressed]}
                onPress={() => sendMessage(item)}
              >
                <Text style={styles.suggestionChipText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Liste des messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isUser = item.sender === "user";
            return (
              <View style={[styles.bubbleWrapper, isUser ? styles.bubbleUserWrap : styles.bubbleAiWrap]}>
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                  {item.imageUri && (
                    <Image source={{ uri: item.imageUri }} style={styles.bubbleImage} resizeMode="cover" />
                  )}
                  {!isUser && item.source && (
                    <View style={styles.sourcePill}>
                      <Ionicons
                        name={item.source.includes("openrouter") ? "sparkles" : "hardware-chip-outline"}
                        size={11}
                        color={item.source.includes("openrouter") ? colors.primary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.sourceText,
                          item.source.includes("openrouter") ? styles.sourceTextOpenRouter : styles.sourceTextLocal,
                        ]}
                      >
                        {item.source === "openrouter-vision"
                          ? "Vision IA OpenRouter"
                          : item.source === "openrouter"
                          ? "IA OpenRouter"
                          : item.source === "agent-local-vision"
                          ? "Vision Moteur Local"
                          : "Moteur Local"}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}>
                    {item.text}
                  </Text>
                </View>

                {/* Articles recommandés sous la réponse de l'IA */}
                {item.articles && item.articles.length > 0 && (
                  <View style={styles.articlesContainer}>
                    <Text style={styles.articlesHeader}>Articles recommandés :</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.articlesScroll}>
                      {item.articles.map((art: Article) => (
                        <Pressable
                          key={art.id}
                          style={({ pressed }) => [styles.articleCard, pressed && styles.cardPressed]}
                          onPress={() => handleArticlePress(art.id)}
                        >
                          {art.photoUri ? (
                            <Image source={{ uri: art.photoUri }} style={styles.articleImg} resizeMode="cover" />
                          ) : (
                            <View style={[styles.articleImg, { backgroundColor: art.color }]} />
                          )}
                          <Text style={styles.articleName} numberOfLines={1}>
                            {art.name}
                          </Text>
                          <View style={styles.cardHeaderRow}>
                            <Text style={styles.articlePrice}>{formatPrice(art.price)}</Text>
                            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                          </View>
                          <View style={styles.shopRow}>
                            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                            <Text style={styles.articleShop} numberOfLines={1}>
                              {art.shop} · {formatDistance(art.distanceM)}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          }}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>L'assistant recherche pour vous...</Text>
              </View>
            ) : undefined
          }
        />

        {/* Barre d'envoi */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.inputBar}>
            <Pressable
              style={({ pressed }) => [styles.cameraBtn, pressed && styles.btnPressed]}
              onPress={handlePhotoOption}
              disabled={loading}
              hitSlop={8}
              accessibilityLabel="Rechercher par photo"
            >
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
            </Pressable>
            <TextInput
              style={styles.inputField}
              placeholder="Posez une question ou photo..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                (!input.trim() || loading) && styles.sendBtnDisabled,
                pressed && input.trim() && !loading && styles.sendBtnPressed,
              ]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  headerSubtitle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.75,
  },
  suggestionsWrapper: { paddingVertical: spacing.xs, backgroundColor: colors.surface },
  suggestionsList: { paddingHorizontal: spacing.md, gap: spacing.xs },
  suggestionChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  suggestionChipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  messagesList: { padding: spacing.md, gap: spacing.md },
  bubbleWrapper: { maxWidth: "85%", gap: spacing.xs },
  bubbleUserWrap: { alignSelf: "flex-end" },
  bubbleAiWrap: { alignSelf: "flex-start", maxWidth: "95%" },
  bubble: { paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.card },
  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: radius.card,
    marginBottom: 6,
    backgroundColor: colors.surface,
  },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleAi: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  sourcePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  sourceText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
  },
  sourceTextOpenRouter: {
    color: colors.primary,
  },
  sourceTextLocal: {
    color: colors.textMuted,
  },
  bubbleText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: "#FFFFFF" },
  bubbleTextAi: { color: colors.text },
  articlesContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    width: "100%",
  },
  articlesHeader: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 2,
    marginBottom: 2,
  },
  articlesScroll: {
    gap: spacing.sm,
    alignItems: "flex-start",
    paddingVertical: 4,
    paddingRight: spacing.sm,
  },
  articleCard: {
    width: 140,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 6,
    alignSelf: "flex-start",
    ...shadows.card,
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  articleImg: { width: "100%", height: 85, borderRadius: 12, backgroundColor: colors.surface },
  articleName: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  articlePrice: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  articleShop: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, flex: 1 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  loadingText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  cameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  inputField: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: colors.disabled },
  sendBtnPressed: {
    transform: [{ scale: 0.92 }],
  },
});

