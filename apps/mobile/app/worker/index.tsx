import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { listCustomers } from "../../src/api/customers";
import { EMPTY_CARE_FOCUS, LOAD_FAILED, LOADING_COPY } from "../../src/lib/scheduleDisplay";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { CardGrid, PageShell } from "../../src/ui/Page";

const ACTIONS = [
  { label: "Assigned clients", href: "/worker/clients", body: "Open the Care Focus list assigned to this shift." },
  { label: "Start visit", href: "/worker/clients", body: "Pick a Care Focus and enter home visit data." },
  { label: "Today's schedule", href: "/worker/schedule", body: "See visits planned for today." },
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
    <PageShell
      title="Care Giver"
      lead={<Text style={[styles.lead, { color: colors.inkMuted }]}>Today's work for this shift.</Text>}
    >
      <CardGrid>
        {ACTIONS.map((action) => (
          <Card key={action.label} style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.ink }]}>{action.label}</Text>
            <Text style={[styles.cardBody, { color: colors.inkMuted }]}>{action.body}</Text>
            <Button label="Open" onPress={() => router.push(action.href)} />
          </Card>
        ))}
        <Card style={styles.card}>
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
      </CardGrid>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  card: { gap: 8, justifyContent: "space-between" },
  cardTitle: { fontFamily, fontSize: 20, fontWeight: "700" },
  cardBody: { fontFamily, fontSize: type.body, lineHeight: 26 },
});
