import { createElement, type ReactNode, type Ref } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { fontFamily, type } from "../theme/tokens";

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad" | "decimal-pad";
  error?: string;
  helper?: string;
  editable?: boolean;
  accessory?: ReactNode;
  autoComplete?: "username" | "password" | "off";
  compact?: boolean;
  inputRef?: Ref<HTMLInputElement | TextInput | null>;
}

function readWebValue(event: {
  target?: { value?: string };
  currentTarget?: { value?: string };
  nativeEvent?: { text?: string };
}) {
  return event.currentTarget?.value ?? event.target?.value ?? event.nativeEvent?.text ?? "";
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  error,
  helper,
  editable = true,
  accessory,
  compact,
  inputRef,
}: TextFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, compact && styles.labelCompact, { color: colors.ink }]}>{label}</Text>
      <View
        style={[
          styles.field,
          {
            borderColor: error ? colors.danger : "#C5D4E4",
            backgroundColor: "#EAF2FA",
          },
          compact && styles.fieldCompact,
        ]}
      >
        {Platform.OS === "web"
          ? createElement("input", {
              ref: inputRef,
              "aria-label": label,
              value,
              placeholder,
              disabled: !editable,
              autoComplete: "off",
              autoCorrect: "off",
              autoCapitalize: "none",
              spellCheck: false,
              name: secureTextEntry ? "daya-secret" : "daya-account",
              type: keyboardType === "email-address" ? "email" : "text",
              inputMode: keyboardType === "phone-pad" ? "tel" : keyboardType === "numeric" ? "numeric" : "text",
              "data-lpignore": "true",
              "data-1p-ignore": "true",
              "data-bwignore": "true",
              "data-form-type": "other",
              onInput: (event: { currentTarget: { value: string } }) => onChangeText(readWebValue(event)),
              onChange: (event: { currentTarget: { value: string } }) => onChangeText(readWebValue(event)),
              style: {
                width: "100%",
                minWidth: 0,
                flex: 1,
                height: compact ? 40 : 56,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: compact ? 14 : 16,
                color: colors.ink,
                fontFamily,
                WebkitTextSecurity: secureTextEntry ? "disc" : "none",
              },
            })
          : (
            <TextInput
              ref={inputRef as Ref<TextInput>}
              accessibilityLabel={label}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={colors.inkMuted}
              secureTextEntry={secureTextEntry}
              keyboardType={keyboardType}
              editable={editable}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              style={[styles.input, compact && styles.inputCompact, { color: colors.ink }]}
            />
          )}
        {accessory}
      </View>
      {error ? (
        <Text style={[styles.meta, { color: colors.danger }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.meta, { color: colors.inkMuted }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    width: "100%",
    gap: 8,
  },
  label: {
    fontFamily,
    fontSize: type.label,
    fontWeight: "600",
  },
  labelCompact: {
    fontSize: 13,
    fontWeight: "400",
  },
  fieldCompact: {
    minHeight: 40,
  },
  field: {
    alignSelf: "stretch",
    width: "100%",
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 56,
    fontFamily,
    fontSize: type.body,
    paddingVertical: 12,
  },
  inputCompact: {
    minHeight: 40,
    paddingVertical: 6,
    fontSize: 14,
  },
  meta: {
    fontFamily,
    fontSize: 15,
    lineHeight: 20,
  },
});
