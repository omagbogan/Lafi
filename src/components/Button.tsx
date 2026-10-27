import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "whatsapp";
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
  const textColor = isPrimary
    ? "#FFFFFF"
    : variant === "whatsapp"
      ? colors.whatsapp
      : colors.primary;

  const content = (
    <View style={styles.row}>
      {icon && <Ionicons name={icon} size={18} color={textColor} />}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      {isPrimary && !disabled ? (
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.inner}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.inner,
            isPrimary
              ? { backgroundColor: colors.disabled }
              : { backgroundColor: colors.card, borderWidth: 1.5, borderColor: textColor },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, overflow: "hidden" },
  pressed: { opacity: 0.85 },
  inner: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 15 },
});