import { useEffect, type ReactNode } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fontFamily } from "../../theme/tokens";

const USERNAME_ID = "daya-login-username";
const PASSWORD_ID = "daya-login-password";

const nativeValues = { username: "", password: "" };

function webInput(id: string): HTMLInputElement | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement ? el : null;
}

export function readLoginUsername() {
  const live = webInput(USERNAME_ID)?.value ?? nativeValues.username;
  return live.trim();
}

export function readLoginPassword() {
  return webInput(PASSWORD_ID)?.value || nativeValues.password;
}

export function writeLoginUsername(value: string) {
  nativeValues.username = value;
  const el = webInput(USERNAME_ID);
  if (el) el.value = value;
}

export function writeLoginPassword(value: string) {
  nativeValues.password = value;
  const el = webInput(PASSWORD_ID);
  if (el) el.value = value;
}

function mountDomInput(hostId: string, inputId: string, defaultValue: string, masked: boolean) {
  if (typeof document === "undefined") return;
  const host = document.getElementById(hostId);
  if (!host) return;
  const existing = webInput(inputId);
  if (existing && host.contains(existing)) return;
  if (existing && !host.contains(existing)) existing.remove();
  const remembered = inputId === USERNAME_ID ? nativeValues.username : nativeValues.password;
  const input = document.createElement("input");
  input.id = inputId;
  input.type = "text";
  input.value = remembered || defaultValue;
  input.autocomplete = "off";
  input.autocapitalize = "off";
  input.spellcheck = false;
  input.setAttribute("autocorrect", "off");
  input.setAttribute("data-lpignore", "true");
  input.setAttribute("data-1p-ignore", "true");
  input.setAttribute("data-bwignore", "true");
  input.setAttribute("data-form-type", "other");
  input.name = inputId;
  input.addEventListener("input", () => {
    if (inputId === USERNAME_ID) nativeValues.username = input.value;
    else nativeValues.password = input.value;
  });
  input.setAttribute(
    "style",
    [
      "width:100%",
      "min-width:0",
      "flex:1",
      "height:40px",
      "border:none",
      "outline:none",
      "background:transparent",
      "font-size:14px",
      "color:#1A2B4C",
      "font-family:inherit",
      masked ? "-webkit-text-security:disc" : "-webkit-text-security:none",
    ].join(";"),
  );
  host.appendChild(input);
}

export function LoginField({
  kind,
  label,
  defaultValue = "",
  placeholder,
  masked,
  error,
  helper,
  accessory,
}: {
  kind: "username" | "password";
  label: string;
  defaultValue?: string;
  placeholder?: string;
  masked?: boolean;
  error?: string;
  helper?: string;
  accessory?: ReactNode;
}) {
  const { colors } = useTheme();
  const id = kind === "username" ? USERNAME_ID : PASSWORD_ID;
  const hostId = `${id}-host`;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    mountDomInput(hostId, id, defaultValue, Boolean(masked));
    const input = webInput(id);
    if (input) {
      if (placeholder) input.placeholder = placeholder;
      input.style.webkitTextSecurity = masked ? "disc" : "none";
    }
  }, [defaultValue, hostId, id, masked, placeholder]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <View
        style={[
          styles.field,
          { borderColor: error ? colors.danger : "#C5D4E4", backgroundColor: "#EAF2FA" },
        ]}
      >
        {Platform.OS === "web" ? (
          <View nativeID={hostId} style={styles.host} />
        ) : (
          <TextInput
            nativeID={id}
            defaultValue={defaultValue}
            placeholder={placeholder}
            placeholderTextColor={colors.inkMuted}
            secureTextEntry={Boolean(masked)}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            onChangeText={(value) => {
              if (kind === "username") nativeValues.username = value;
              else nativeValues.password = value;
            }}
            style={{ flexGrow: 1, minWidth: 0, minHeight: 40, fontFamily, fontSize: 14, color: colors.ink }}
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
  wrap: { alignSelf: "stretch", width: "100%", gap: 8 },
  label: { fontFamily, fontSize: 13, fontWeight: "400" },
  field: {
    alignSelf: "stretch",
    width: "100%",
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  host: { flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 40, justifyContent: "center" },
  meta: { fontFamily, fontSize: 15, lineHeight: 20 },
});
