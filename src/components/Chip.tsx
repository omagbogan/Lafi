import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, radius } from "../theme";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export default function Chip({ label, active = false, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
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
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  labelActive: { color: "#FFFFFF" },
});