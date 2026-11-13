/**
 * src/components/SwipeButton.tsx
 * ------------------------------
 * Bouton de confirmation à glissement horizontal (Swipe to Confirm).
 *
 * Soutenance Développeur Data IA (Bloc 3 - Application & Ergonomie mobile) :
 * - Sécurisation des actions irréversibles : remplace un simple clic accidentel
 *   par un geste délibéré de glissement (standard dans les applications de livraison / VTC).
 * - Implémentation React Native pure : utilise `PanResponder` et `Animated` du noyau
 *   React Native pour garantir une fluidité à 60 FPS sur iOS et Android sans dépendances lourdes.
 * - Robustesse tactile :
 *   - `pointerEvents="none"` sur le texte pour ne pas intercepter les touches.
 *   - Gestion dynamique de `maxDxRef` pour éviter tout problème de closure à l'initialisation.
 *   - `onPanResponderTerminationRequest: () => false` pour empêcher les `ScrollView` de voler le geste.
 *   - Seuil équilibré (50% de la course) avec retour élastique (spring) en cas de geste incomplet.
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fonts, radius } from "../theme";

const THUMB_SIZE = 46;
const TRACK_PADDING = 4;
const SWIPE_THRESHOLD_RATIO = 0.5; // Déclenchement à 50% de la course

type Props = {
  label: string;
  completedLabel?: string;
  onSwipeComplete: () => void | Promise<void>;
  variant?: "primary" | "success";
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
};

export default function SwipeButton({
  label,
  completedLabel = "Confirmé !",
  onSwipeComplete,
  variant = "primary",
  icon = "chevron-forward",
  disabled = false,
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const isActionRunningRef = useRef(false);

  // Références dynamiques pour garantir l'accès aux valeurs fraîches dans les callbacks du PanResponder
  const maxDxRef = useRef(0);
  const disabledRef = useRef(disabled);
  const isCompletedRef = useRef(isCompleted);
  const onSwipeCompleteRef = useRef(onSwipeComplete);

  useEffect(() => {
    disabledRef.current = disabled;
    isCompletedRef.current = isCompleted;
    onSwipeCompleteRef.current = onSwipeComplete;
  });

  const isSuccess = variant === "success";
  const mainColor = isSuccess ? colors.open : colors.primary;
  const trackBg = isSuccess ? colors.openSurface : colors.primaryLight;
  const trackBorder = isSuccess ? colors.open : colors.primary;

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setTrackWidth(width);
      maxDxRef.current = Math.max(0, width - THUMB_SIZE - TRACK_PADDING * 2);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !disabledRef.current && !isCompletedRef.current && !isActionRunningRef.current,
      onStartShouldSetPanResponderCapture: () => false,

      onMoveShouldSetPanResponder: (_, gesture) => {
        if (disabledRef.current || isCompletedRef.current || isActionRunningRef.current) return false;
        // Détecte un glissement horizontal prédominant
        return Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        if (disabledRef.current || isCompletedRef.current || isActionRunningRef.current) return false;
        return Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },

      // Crucial : empêche les ScrollView / FlatList parents de voler le geste tactile pendant le glissement
      onPanResponderTerminationRequest: () => false,

      onPanResponderMove: (_, gesture) => {
        if (disabledRef.current || isCompletedRef.current || isActionRunningRef.current) return;
        const currentMax = maxDxRef.current;
        if (currentMax <= 0) return;
        const boundedDx = Math.max(0, Math.min(gesture.dx, currentMax));
        translateX.setValue(boundedDx);
      },

      onPanResponderRelease: async (_, gesture) => {
        if (disabledRef.current || isCompletedRef.current || isActionRunningRef.current) return;
        const currentMax = maxDxRef.current;

        if (currentMax > 0 && gesture.dx >= currentMax * SWIPE_THRESHOLD_RATIO) {
          // Geste validé : on termine l'animation jusqu'au bout
          isActionRunningRef.current = true;
          Animated.timing(translateX, {
            toValue: currentMax,
            duration: 120,
            useNativeDriver: false,
          }).start(async () => {
            setIsSubmitting(true);
            try {
              await onSwipeCompleteRef.current();
              setIsCompleted(true);
            } catch {
              // En cas d'erreur réseau, on remet le curseur en place
              Animated.spring(translateX, {
                toValue: 0,
                bounciness: 4,
                useNativeDriver: false,
              }).start();
            } finally {
              setIsSubmitting(false);
              isActionRunningRef.current = false;
            }
          });
        } else {
          // Geste incomplet : retour élastique au point de départ
          Animated.spring(translateX, {
            toValue: 0,
            bounciness: 6,
            useNativeDriver: false,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          bounciness: 6,
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  // L'opacité du texte diminue progressivement lors du déplacement
  const currentMax = maxDxRef.current || Math.max(1, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);
  const textOpacity = translateX.interpolate({
    inputRange: [0, currentMax * 0.55],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      onLayout={onLayout}
      {...panResponder.panHandlers}
      style={[
        styles.track,
        { backgroundColor: trackBg, borderColor: trackBorder },
        disabled && styles.trackDisabled,
      ]}
    >
      {/* Texte indicatif centré (pointerEvents="none" pour laisser passer les gestes) */}
      <Animated.View
        pointerEvents="none"
        style={[styles.textContainer, { opacity: isCompleted ? 1 : textOpacity }]}
      >
        <Text style={[styles.label, { color: mainColor }, disabled && styles.labelDisabled]}>
          {isCompleted ? completedLabel : label}
        </Text>
      </Animated.View>

      {/* Curseur coulissant (pointerEvents="none" car le track gère les panHandlers) */}
      {!isCompleted && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              backgroundColor: mainColor,
              transform: [{ translateX }],
            },
            disabled && styles.thumbDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name={icon} size={22} color="#FFFFFF" />
          )}
        </Animated.View>
      )}

      {/* État validé fixe */}
      {isCompleted && (
        <View pointerEvents="none" style={[styles.completedBadge, { backgroundColor: mainColor }]}>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    justifyContent: "center",
    padding: TRACK_PADDING,
    position: "relative",
    overflow: "hidden",
  },
  trackDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.disabled,
  },
  textContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 54,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13,
    textAlign: "center",
  },
  labelDisabled: {
    color: colors.textMuted,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbDisabled: {
    backgroundColor: colors.disabled,
  },
  completedBadge: {
    position: "absolute",
    right: TRACK_PADDING,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
