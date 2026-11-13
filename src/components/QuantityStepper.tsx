import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme";

type Props = {
  value: number;
  onChange: (value: number) => void;
};

export default function QuantityStepper({ value, onChange }: Props) {
  return (
    <View style={styles.box}>
      <Pressable
        hitSlop={8}
        onPress={() => onChange(Math.max(1, value - 1))}
        style={({ pressed }) => [styles.signBtn, pressed && styles.signBtnPressed]}
        accessibilityLabel="Diminuer la quantité"
      >
        <Text style={[styles.sign, value <= 1 && styles.signDisabled]}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        hitSlop={8}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [styles.signBtn, pressed && styles.signBtnPressed]}
        accessibilityLabel="Augmenter la quantité"
      >
        <Text style={styles.sign}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  signBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  signBtnPressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.7,
  },
  sign: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    lineHeight: 18,
  },
  signDisabled: {
    color: colors.disabled,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    minWidth: 18,
    textAlign: "center",
  },
});
