import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { listCustomers } from "../../src/api/customers";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { CardGrid, PageShell } from "../../src/ui/Page";

export default function ClientsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const query = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
    retry: 1,
  });

  return (
    <PageShell
      title="Select Care Focus"
      lead={
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Assigned clients for this Care Giver shift. Choose a Care Focus to enter visit data.
        </Text>
      }
    >
      {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading…</Text> : null}
      {query.isError ? (
        <Text style={[styles.meta, { color: colors.inkMuted }]}>Could not load clients. Try again in a moment.</Text>
      ) : null}
      {query.data?.length === 0 ? (
        <Text style={[styles.meta, { color: colors.inkMuted }]}>No Care Focus is assigned to you yet.</Text>
      ) : null}
      <CardGrid>
        {query.data?.map((client) => (
          <Card key={client.customer_id} style={styles.card}>
            <Text style={[styles.name, { color: colors.ink }]}>{client.name}</Text>
            <Text style={[styles.meta, { color: colors.inkMuted }]}>{client.address}</Text>
            <Text style={[styles.plan, { color: colors.blue }]}>{client.plan ?? "Plan"} plan</Text>
            <Button
              label="Enter Care Focus data"
              onPress={() => router.push(`/worker/visit/${client.customer_id}`)}
            />
          </Card>
        ))}
      </CardGrid>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  card: { gap: 8, justifyContent: "space-between" },
  name: { fontFamily, fontSize: 20, fontWeight: "700" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
  plan: { fontFamily, fontSize: 15, fontWeight: "600", marginBottom: 8 },
});
