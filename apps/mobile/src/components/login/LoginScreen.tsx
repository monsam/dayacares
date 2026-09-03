import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { createElement, useRef, useState, type ComponentProps } from "react";
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

const FEATURES_LEFT = [
  {
    icon: "alert-circle-outline" as const,
    tint: "#E53935",
    title: "Emergency SOS",
    body: "Alert the Durgapur centre and linked Care Family when someone needs help now.",
  },
  {
    icon: "calendar-outline" as const,
    tint: "#0057B8",
    title: "Manage your home visits",
    body: "Check upcoming visits and the Care Giver assigned to each one.",
  },
];

const FEATURES_RIGHT = [
  {
    icon: "flask-outline" as const,
    tint: "#0057B8",
    title: "Access your visit results",
    body: "See vitals, worker notes, and comments after each home visit.",
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
  const { width, height } = useWindowDimensions();
  const { session, signIn } = useAuth();
  const isWide = width >= 980;
  const pagePad = isWide ? 36 : 22;
  const panelMin = Math.max(560, height - pagePad * 2);
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
      <ScrollView contentContainerStyle={[styles.page, { padding: pagePad }]}>
        <View style={[styles.panel, isWide ? styles.panelWide : styles.panelNarrow, { minHeight: panelMin }]}>
          <View style={styles.left}>
            <Image
              source={logo}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="DAYA CARES and SOHOJIA logo"
            />
            <View style={[styles.heroPanel, !isWide && styles.heroPanelNarrow]}>
              <View style={[styles.heroBand, !isWide && styles.heroBandNarrow]}>
                <View style={styles.featureCol}>
                  {FEATURES_LEFT.map((feature) => (
                    <FeatureItem key={feature.title} {...feature} />
                  ))}
                </View>
                <Image
                  source={hero}
                  style={[styles.hero, !isWide && styles.heroNarrow]}
                  resizeMode="contain"
                  accessibilityLabel="Daya Cares families in Durgapur"
                />
                <View style={styles.featureCol}>
                  {FEATURES_RIGHT.map((feature) => (
                    <FeatureItem key={feature.title} {...feature} />
                  ))}
                </View>
              </View>
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

function FeatureItem({
  icon,
  tint,
  title,
  body,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  tint: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.iconBubble, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={26} color={tint} />
      </View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
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
  },
  panel: {
    width: "100%",
    maxWidth: 1240,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#0A2540",
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  panelWide: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 20,
  },
  panelNarrow: {
    flexDirection: "column",
    borderRadius: 16,
  },
  left: {
    flex: 1.65,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 14,
  },
  heroPanel: {
    flexGrow: 1,
    backgroundColor: "#E8F3FA",
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 24,
    justifyContent: "center",
  },
  heroPanelNarrow: {
    minHeight: 0,
    paddingVertical: 16,
  },
  logo: {
    width: "100%",
    height: 112,
    alignSelf: "stretch",
  },
  heroBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  heroBandNarrow: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  featureCol: {
    flex: 1,
    gap: 28,
    minWidth: 0,
  },
  hero: {
    width: 340,
    height: 280,
  },
  heroNarrow: {
    width: "100%",
    height: 220,
    alignSelf: "center",
  },
  featureItem: {
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
  leftFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    marginTop: "auto" as never,
    paddingTop: 4,
  },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  storeBadge: {
    width: 148,
    height: 44,
  },
  contrastText: { fontFamily, fontSize: 13, fontWeight: "600" },
  right: {
    width: 380,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 32,
    paddingVertical: 28,
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
