import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { radius, shadow } from "../theme/tokens";

export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[styles.card, shadow.card, { backgroundColor: colors.white, borderColor: colors.line }, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 18,
  },
});
