import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { listCustomers } from "../../src/api/customers";
import { useAuth } from "../../src/auth/AuthContext";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, space, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";

export default function MembersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, ready } = useAuth();
  const query = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
    enabled: session?.role === "ADMIN",
    retry: 1,
  });

  useEffect(() => {
    if (ready && session?.role !== "ADMIN") {
      router.replace(session ? "/home" : "/");
    }
  }, [ready, session, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.nav, { backgroundColor: colors.navy }]}>
        <Pressable onPress={() => router.push("/home")} accessibilityRole="button">
          <Text style={styles.navBack}>Home</Text>
        </Pressable>
        <Text style={styles.navTitle}>Members</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Registered Care Recipients. Use Register to add a member from the paper form.
        </Text>
        <Button label="Register Care Recipient" onPress={() => router.push("/admin/register")} />
        {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading members…</Text> : null}
        {query.isError ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]}>Could not load members. Try again in a moment.</Text>
        ) : null}
        {query.data?.map((member) => (
          <Card key={member.customer_id} style={styles.card}>
            <Text style={[styles.name, { color: colors.ink }]}>{member.name}</Text>
            <Text style={[styles.meta, { color: colors.inkMuted }]}>{member.address}</Text>
            <Text style={[styles.meta, { color: colors.blue }]}>
              {member.plan ?? "Plan"} · {member.subscription_status} · {member.customer_id}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    minHeight: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBack: { fontFamily, color: "#FFFFFF", fontSize: 16, fontWeight: "600", width: 56 },
  navTitle: { fontFamily, color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  page: { padding: space.lg, gap: space.md, paddingBottom: 40 },
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  card: { gap: 6 },
  name: { fontFamily, fontSize: 22, fontWeight: "800" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
});
