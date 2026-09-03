import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ROLE_LABEL, useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { fontFamily } from "../theme/tokens";

const logo = require("../../assets/logo.png");

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppHeader({ showHome = true }: { showHome?: boolean }) {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const atHome = pathname === "/home";

  return (
    <View style={[styles.bar, { backgroundColor: colors.navy }]}>
      <View style={styles.left}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="DAYA CARES" />
        {showHome ? (
          <Pressable
            onPress={() => router.push("/home")}
            accessibilityRole="button"
            accessibilityLabel="Home"
            style={[styles.homeBtn, atHome ? styles.homeBtnOn : undefined]}
          >
            <Ionicons name="home-outline" size={22} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
      {session ? (
        <View style={styles.right}>
          <Text style={styles.role}>{ROLE_LABEL[session.role]}</Text>
          <View style={styles.avatar} accessibilityLabel={session.name}>
            <Text style={styles.avatarText}>{initials(session.name)}</Text>
          </View>
          <Pressable
            onPress={() => {
              signOut();
              router.replace("/");
            }}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 4 },
  homeBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  homeBtnOn: { backgroundColor: "rgba(255,255,255,0.18)" },
  logo: { width: 188, height: 34 },
  right: { flexDirection: "row", alignItems: "center", gap: 12 },
  role: { fontFamily, color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2F80ED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontFamily, fontWeight: "700", fontSize: 13 },
  signOut: { fontFamily, color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
});
