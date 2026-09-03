import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { listCustomers } from "../../src/api/customers";
import { EMPTY_CARE_FOCUS, LOAD_FAILED, LOADING_COPY } from "../../src/lib/scheduleDisplay";
import { useTheme } from "../../src/theme/ThemeContext";
import { space, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";

const ACTIONS = [
  { label: "Assigned clients", href: "/worker/clients" },
  { label: "Start visit", href: "/worker/clients" },
  { label: "Today's schedule", href: "/worker/schedule" },
];

export default function WorkerDashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const query = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
    retry: 1,
  });
  const count = query.data?.length ?? 0;
  const names = query.data?.map((customer) => customer.name).join(", ") ?? "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.nav, { backgroundColor: colors.navy }]}>
        <Pressable onPress={() => router.push("/home")} accessibilityRole="button">
          <Text style={styles.navBack}>Home</Text>
        </Pressable>
        <Text style={styles.navBrand}>Care Giver</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.hello, { color: colors.ink }]}>Today's work</Text>
        <View style={styles.actions}>
          {ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.href)}
              style={[styles.tile, { backgroundColor: colors.white, borderColor: colors.line }]}
            >
              <Text style={[styles.tileLabel, { color: colors.blue }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
        <Card>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Assigned Care Focus</Text>
          <Text style={[styles.cardBody, { color: colors.inkMuted }]}>
            {query.isLoading
              ? LOADING_COPY
              : query.isError
                ? LOAD_FAILED
                : count
                  ? `${count} assigned · ${names}`
                  : EMPTY_CARE_FOCUS}
          </Text>
          <Button label="Open Care Focus list" onPress={() => router.push("/worker/clients")} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    minHeight: 56,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBack: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  navBrand: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  page: { padding: space.lg, gap: space.lg },
  hello: { fontSize: type.display, fontWeight: "800" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tile: {
    minWidth: 140,
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  tileLabel: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  cardTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  cardBody: { fontSize: type.body, lineHeight: 26, marginBottom: 16 },
});
