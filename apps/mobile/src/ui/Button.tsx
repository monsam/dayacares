import { createElement } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { fontFamily, type } from "../theme/tokens";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "compact";
  disabled?: boolean;
  accessibilityHint?: string;
  submit?: boolean;
  pressOnDown?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "default",
  disabled,
  accessibilityHint,
  submit,
  pressOnDown,
}: ButtonProps) {
  const { colors } = useTheme();
  const background =
    variant === "primary" ? colors.blue : variant === "secondary" ? colors.white : "transparent";
  const borderColor = variant === "ghost" ? "transparent" : colors.blue;
  const textColor = variant === "primary" ? colors.white : colors.blue;

  if (submit && Platform.OS === "web") {
    return createElement(
      "button",
      {
        type: "submit",
        disabled,
        "aria-label": label,
        onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
        style: {
          width: "100%",
          minHeight: size === "compact" ? 40 : 52,
          paddingLeft: size === "compact" ? 14 : 18,
          paddingRight: size === "compact" ? 14 : 18,
          borderRadius: 4,
          borderWidth: 2,
          borderStyle: "solid",
          borderColor,
          backgroundColor: background,
          color: textColor,
          fontFamily,
          fontSize: size === "compact" ? 14 : type.button,
          fontWeight: 600,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.45 : 1,
        },
      },
      label,
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={pressOnDown && Platform.OS === "web" ? undefined : onPress}
      onPressIn={pressOnDown && Platform.OS === "web" ? onPress : undefined}
      style={({ pressed }) => [
        styles.base,
        size === "compact" && styles.baseCompact,
        {
          backgroundColor: background,
          borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.86 : 1,
        },
      ]}
    >
      <Text style={[styles.label, size === "compact" && styles.labelCompact, { color: textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 52,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  label: {
    fontFamily,
    fontSize: type.button,
    fontWeight: "600",
  },
  baseCompact: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  labelCompact: {
    fontSize: 14,
  },
});
