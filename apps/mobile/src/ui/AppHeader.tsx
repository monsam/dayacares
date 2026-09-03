import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { listNotifications } from "../api/notifications";
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
  const atProfile = pathname === "/profile";
  const atNotifications = pathname.startsWith("/notifications");

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    enabled: Boolean(session),
    refetchInterval: 30000,
  });
  const unread = notifications.data?.unread_count ?? 0;

  return (
    <View style={[styles.bar, { backgroundColor: colors.navy }]}>
      <View style={styles.left}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="DAYA CARES" />
        {showHome ? (
          <Pressable
            onPress={() => router.push("/home")}
            accessibilityRole="button"
            accessibilityLabel="Home"
            style={[styles.iconBtn, atHome ? styles.iconBtnOn : undefined]}
          >
            <Ionicons name="home-outline" size={22} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
      {session ? (
        <View style={styles.right}>
          <Text style={styles.role}>{ROLE_LABEL[session.role]}</Text>
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
            style={[styles.iconBtn, atNotifications ? styles.iconBtnOn : undefined]}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? "9+" : String(unread)}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push("/profile")}
            accessibilityRole="button"
            accessibilityLabel={`Profile, ${session.name}`}
            style={[styles.avatar, atProfile ? styles.avatarOn : undefined]}
          >
            <Text style={styles.avatarText}>{initials(session.name)}</Text>
          </Pressable>
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  iconBtnOn: { backgroundColor: "rgba(255,255,255,0.18)" },
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
  avatarOn: { borderWidth: 2, borderColor: "#FFFFFF" },
  avatarText: { color: "#FFFFFF", fontFamily, fontWeight: "700", fontSize: 13 },
  signOut: { fontFamily, color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontFamily, fontSize: 9, fontWeight: "800" },
});
