import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadows } from "../theme";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "whatsapp" | "danger";
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
}: Props) {
  const isPrimary = variant === "primary";
  const isWhatsApp = variant === "whatsapp";
  const isDanger = variant === "danger";

  const textColor = isPrimary
    ? "#FFFFFF"
    : isWhatsApp
      ? colors.whatsapp
      : isDanger
        ? colors.danger
        : colors.primary;

  const content = (
    <View style={styles.row}>
      {icon && <Ionicons name={icon} size={18} color={textColor} />}
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary && !disabled && styles.primaryShadow,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.inner,
          isPrimary
            ? { backgroundColor: disabled ? colors.disabled : colors.primary }
            : isWhatsApp
              ? { backgroundColor: colors.openSurface, borderWidth: 1.5, borderColor: colors.whatsapp }
              : isDanger
                ? { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.danger }
                : { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primary },
        ]}
      >
        {content}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
  },
  primaryShadow: {
    ...shadows.button,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  inner: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
});
