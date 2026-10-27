import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme";

type Props = {
  value: number;
  onChange: (value: number) => void;
};

export default function QuantityStepper({ value, onChange }: Props) {
  return (
    <View style={styles.box}>
      <Pressable hitSlop={8} onPress={() => onChange(value - 1)}>
        <Text style={styles.sign}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable hitSlop={8} onPress={() => onChange(value + 1)}>
        <Text style={styles.sign}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sign: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  value: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, minWidth: 14, textAlign: "center" },
});