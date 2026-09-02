import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { fontFamily } from "../theme/tokens";

export function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.blue : colors.white,
          borderColor: colors.blue,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text style={{ color: selected ? colors.white : colors.blue, fontFamily, fontSize: 16, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
});
