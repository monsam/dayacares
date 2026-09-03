import { Pressable, StyleSheet, Text, View, type ViewProps } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { fontFamily } from "../theme/tokens";

export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[styles.card, { backgroundColor: colors.white, borderColor: colors.line }, style]}
    />
  );
}

export function CardAction({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.action, { borderTopColor: colors.line }]}
    >
      <Text style={[styles.actionLabel, { color: colors.blue }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 20,
  },
  action: {
    marginHorizontal: -20,
    marginBottom: -20,
    marginTop: 16,
    paddingHorizontal: 20,
    minHeight: 48,
    justifyContent: "center",
    borderTopWidth: 1,
  },
  actionLabel: { fontFamily, fontSize: 16, fontWeight: "600" },
});
