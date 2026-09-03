import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { createElement, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { fontFamily } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { LoginField, readLoginPassword, readLoginUsername } from "./LoginFields";

const logo = require("../../../assets/logo.png");
const hero = require("../../../assets/hero.png");
const badgeApple = require("../../../assets/badge_apple.png");
const badgeAndroid = require("../../../assets/badge_android.png");

const FEATURES = [
  {
    icon: "alert-circle-outline" as const,
    tint: "#E53935",
    title: "Emergency SOS",
    body: "Alert the Durgapur centre and linked Care Family when someone needs help now.",
  },
  {
    icon: "flask-outline" as const,
    tint: "#7B61FF",
    title: "Access your visit results",
    body: "See vitals, worker notes, and comments after each home visit.",
  },
  {
    icon: "calendar-outline" as const,
    tint: "#E85D4C",
    title: "Manage your home visits",
    body: "Check upcoming visits and the Care Giver assigned to each one.",
  },
  {
    icon: "call-outline" as const,
    tint: "#2E9E6B",
    title: "Welfare calls",
    body: "See scheduled welfare checks for Care Focus members in Durgapur.",
  },
];

export function LoginScreen() {
  const { colors, highContrast, toggleHighContrast } = useTheme();
  const { width } = useWindowDimensions();
  const { session, signIn } = useAuth();
  const isWide = width >= 980;
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const onLogin = async () => {
    if (pendingRef.current) return;
    const account = readLoginUsername();
    const secret = readLoginPassword();
    if (!account) {
      setError("Enter your username.");
      return;
    }
    if (!secret) {
      setError("Enter your password.");
      return;
    }
    pendingRef.current = true;
    setPending(true);
    try {
      await signIn(account, secret);
      setError(undefined);
    } catch (err) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? "")
          : err instanceof Error
            ? err.message
            : "";
      setError(message || "Username or password is incorrect.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const loginFields = (
    <>
      <LoginField kind="username" label="Username" />
      <LoginField
        kind="password"
        label="Password"
        masked={!showPassword}
        error={error}
        accessory={
          <Pressable
            onPress={() => setShowPassword((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color="#5B6775"
            />
          </Pressable>
        }
      />
      <Text style={styles.help}>
        Forgot your password? Call the Durgapur centre at 0343 240 0000.
      </Text>
      <Button
        submit
        label={pending ? "Signing in…" : "Sign in"}
        size="compact"
        disabled={pending}
        onPress={() => {
          void onLogin();
        }}
      />
    </>
  );

  if (session) {
    return <Redirect href="/home" />;
  }

  return (
    <View style={styles.root}>
      <WaveBackground />
      <ScrollView contentContainerStyle={[styles.page, !isWide && styles.pageNarrow]}>
        <View style={[styles.panel, isWide ? styles.panelWide : styles.panelNarrow]}>
          <View style={styles.left}>
            <Image
              source={logo}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="DAYA CARES and SOHOJIA logo"
            />
            <Image
              source={hero}
              style={styles.hero}
              resizeMode="contain"
              accessibilityLabel="Daya Cares families in Durgapur"
            />
            <View style={styles.featureGrid}>
              {FEATURES.map((feature) => (
                <View key={feature.title} style={styles.featureItem}>
                  <View style={[styles.iconBubble, { backgroundColor: `${feature.tint}18` }]}>
                    <Ionicons name={feature.icon} size={26} color={feature.tint} />
                  </View>
                  <View style={styles.featureCopy}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureBody}>{feature.body}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.leftFooter}>
              <View style={styles.storeRow}>
                <Image
                  source={badgeApple}
                  style={styles.storeBadge}
                  resizeMode="contain"
                  accessibilityLabel="Download on the App Store"
                />
                <Image
                  source={badgeAndroid}
                  style={styles.storeBadge}
                  resizeMode="contain"
                  accessibilityLabel="Get it on Google Play"
                />
              </View>
              <Pressable onPress={toggleHighContrast} accessibilityRole="button">
                <Text style={[styles.contrastText, { color: colors.blue }]}>
                  {highContrast ? "Use standard contrast" : "Use high contrast"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.right, !isWide && styles.rightNarrow]}>
            <Text style={styles.loginTitle}>Sign in to Daya Cares</Text>
            <Text style={styles.loginSub}>Use the username the centre created for you.</Text>

            {Platform.OS === "web"
              ? createElement(
                  "form",
                  {
                    onSubmit: (event: { preventDefault: () => void }) => {
                      event.preventDefault();
                      void onLogin();
                    },
                    autoComplete: "off",
                    style: { display: "flex", flexDirection: "column", gap: 12, width: "100%" },
                  },
                  loginFields,
                )
              : loginFields}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function WaveBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.wave, styles.waveOne]} />
      <View style={[styles.wave, styles.waveTwo]} />
      <View style={[styles.wave, styles.waveThree]} />
      <View style={[styles.wave, styles.waveFour]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#2E86C7",
  },
  wave: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  waveOne: { width: 720, height: 420, top: -140, left: -180 },
  waveTwo: { width: 640, height: 360, bottom: -160, right: -120, backgroundColor: "rgba(186,224,255,0.22)" },
  waveThree: { width: 380, height: 380, top: "38%", left: "28%", backgroundColor: "rgba(255,255,255,0.08)" },
  waveFour: { width: 520, height: 280, bottom: 40, left: -80, backgroundColor: "rgba(164,214,255,0.18)" },
  page: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  pageNarrow: { padding: 16 },
  panel: {
    width: "100%",
    maxWidth: 1180,
    backgroundColor: "#F4F8FC",
    overflow: "hidden",
    shadowColor: "#0A2540",
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  panelWide: {
    flexDirection: "row",
    borderRadius: 20,
  },
  panelNarrow: {
    flexDirection: "column",
    borderRadius: 16,
  },
  left: {
    flex: 1.65,
    backgroundColor: "#F4F8FC",
    paddingHorizontal: 28,
    paddingVertical: 20,
    gap: 12,
  },
  logo: {
    width: "100%",
    height: 88,
    alignSelf: "stretch",
  },
  hero: {
    width: "100%",
    height: 190,
    maxHeight: 190,
    borderRadius: 16,
    backgroundColor: "#E8F3FA",
    alignSelf: "center",
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 20,
    rowGap: 18,
  },
  featureItem: {
    width: "47%",
    minWidth: 220,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureCopy: { flex: 1, minWidth: 0 },
  featureTitle: { fontFamily, fontSize: 16, fontWeight: "700", color: "#1A2B4C", marginBottom: 4 },
  featureBody: { fontFamily, fontSize: 14, lineHeight: 20, color: "#5B6775" },
  leftFooter: { marginTop: "auto" as never, gap: 14, paddingTop: 8 },
  storeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  storeBadge: {
    width: 148,
    height: 44,
  },
  contrastText: { fontFamily, fontSize: 13, fontWeight: "600" },
  right: {
    width: 380,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 32,
    paddingVertical: 36,
    gap: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#E4EAF1",
    justifyContent: "center",
  },
  rightNarrow: {
    width: "100%",
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: "#E4EAF1",
  },
  loginTitle: { fontFamily, fontSize: 22, lineHeight: 28, color: "#1A2B4C", fontWeight: "700" },
  loginSub: { fontFamily, fontSize: 14, lineHeight: 20, color: "#5B6775", marginBottom: 8 },
  help: { fontFamily, fontSize: 13, lineHeight: 18, color: "#5B6775" },
});
