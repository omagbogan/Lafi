import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, radius } from "../theme";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export default function Chip({ label, active = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  labelActive: {
    fontFamily: fonts.semibold,
    color: "#FFFFFF",
  },
});
