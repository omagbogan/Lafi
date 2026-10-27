import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { Article } from "../data/articles";
import { colors, fonts, radius, spacing } from "../theme";
import Button from "./Button";

type Props = {
  article: Article | null;
  onClose: () => void;
  onSave: (changes: Partial<Article>) => void;
};

function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
}

export default function EditArticleSheet({ article, onClose, onSave }: Props) {
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [visible, setVisible] = useState(true);
  const [outOfStock, setOutOfStock] = useState(false);

  // Recopie les valeurs de l'article chaque fois qu'on en ouvre un autre
  useEffect(() => {
    if (!article) return;
    setPrice(String(article.price));
    setNegotiable(!!article.negotiable);
    setVisible(!article.hidden);
    setOutOfStock(!!article.outOfStock);
  }, [article]);

  const valid = Number(price) > 0;

  return (
    <Modal visible={article !== null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Modifier l'article</Text>
          <Text style={styles.name}>{article?.name}</Text>

          <Text style={styles.label}>Prix (FCFA)</Text>
          <TextInput
            style={styles.field}
            keyboardType="numeric"
            value={price}
            onChangeText={(text) => setPrice(text.replace(/\D/g, ""))}
          />

          <SwitchRow label="Prix à débattre" value={negotiable} onChange={setNegotiable} />
          <SwitchRow label="Visible par les clients" value={visible} onChange={setVisible} />
          <SwitchRow label="En rupture de stock" value={outOfStock} onChange={setOutOfStock} />

          <View style={styles.button}>
            <Button
              label="Enregistrer"
              disabled={!valid}
              onPress={() =>
                onSave({ price: Number(price), negotiable, hidden: !visible, outOfStock })
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  name: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
  field: {
    height: 50,
    backgroundColor: colors.card,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  button: { marginTop: spacing.sm },
});