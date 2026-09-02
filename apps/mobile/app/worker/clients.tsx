import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { listCustomers } from "../../src/api/customers";
import { useTheme } from "../../src/theme/ThemeContext";
import { space, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";

export default function ClientsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const query = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
    retry: 1,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.nav, { backgroundColor: colors.navy }]}>
        <Text style={styles.navBrand}>Select Care Focus</Text>
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Assigned clients for this Care Giver shift. Choose a Care Focus to enter visit data.
        </Text>
        {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading from MySQL…</Text> : null}
        {query.isError ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]}>
            Could not load clients. Start the API with npm run api:dev.
          </Text>
        ) : null}
        {query.data?.length === 0 ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]}>No assigned Care Focus in MySQL.</Text>
        ) : null}
        {query.data?.map((client) => (
          <Card key={client.customer_id} style={styles.card}>
            <Text style={[styles.name, { color: colors.ink }]}>{client.name}</Text>
            <Text style={[styles.meta, { color: colors.inkMuted }]}>{client.address}</Text>
            <Text style={[styles.meta, { color: colors.blue }]}>{client.plan ?? "Plan"} plan</Text>
            <Button
              label="Enter Care Focus data"
              onPress={() => router.push(`/worker/visit/${client.customer_id}`)}
            />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { minHeight: 56, paddingHorizontal: space.lg, justifyContent: "center" },
  navBrand: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  page: { padding: space.lg, gap: space.md },
  lead: { fontSize: type.body, lineHeight: 26 },
  card: { gap: 8 },
  name: { fontSize: 22, fontWeight: "800" },
  meta: { fontSize: 16, lineHeight: 22 },
});
