import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CardGrid, PageShell } from "../../ui/Page";
import { listCustomers } from "../../api/customers";
import { listVisitLogs } from "../../api/visits";
import { useAuth } from "../../auth/AuthContext";
import { formatVisitWhen, formatVitalsLine, visitAlert, vitalRows } from "../../lib/visitDisplay";
import { useTheme } from "../../theme/ThemeContext";
import { fontFamily, type } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { ReportFormsCard } from "./ReportFormsCard";

export function VisitHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, ready } = useAuth();
  const [customerId, setCustomerId] = useState<string>("");

  useEffect(() => {
    if (ready && !session) {
      router.replace("/");
    }
  }, [ready, session, router]);

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
    enabled: Boolean(session),
    retry: 1,
  });

  const customers = customersQuery.data ?? [];
  const selectedId = customers.some((customer) => customer.customer_id === customerId)
    ? customerId
    : customers.length === 1
      ? customers[0].customer_id
      : "";

  const logsQuery = useQuery({
    queryKey: ["visit-logs", selectedId],
    queryFn: () => listVisitLogs(selectedId),
    enabled: Boolean(session && selectedId),
    retry: 1,
  });

  const logs = logsQuery.data ?? [];
  const latest = logs[0];
  const latestRows = useMemo(() => (latest ? vitalRows(latest.log.vitals_payload) : []), [latest]);
  const selectedCustomer = customers.find((customer) => customer.customer_id === selectedId);

  return (
    <PageShell
      title="Visit history"
      lead={
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          {session?.role === "ADMIN"
            ? "Select a Care Focus to open visit history and download their paper forms."
            : "Select a Care Focus to see visit history and recorded vitals."}
        </Text>
      }
    >

        {customers.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {customers.map((customer) => {
              const active = selectedId === customer.customer_id;
              return (
                <Pressable
                  key={customer.customer_id}
                  onPress={() => setCustomerId(customer.customer_id)}
                  style={[
                    styles.chip,
                    { borderColor: colors.blue, backgroundColor: active ? colors.blue : colors.white },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? colors.white : colors.blue }]}>{customer.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {session?.role === "ADMIN" ? (
          <ReportFormsCard
            customerId={selectedId || undefined}
            logId={selectedId ? latest?.log.log_id : undefined}
          />
        ) : null}

        {selectedCustomer ? (
          <Text style={[styles.lead, { color: colors.inkMuted }]}>
            Visit history for {selectedCustomer.name}.
          </Text>
        ) : (
          <Text style={[styles.lead, { color: colors.inkMuted }]}>
            Choose someone above to load visits.
          </Text>
        )}

        {logsQuery.isLoading || customersQuery.isLoading ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading visits…</Text>
        ) : null}
        {logsQuery.isError ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]}>
            Could not load visits. Try again in a moment.
          </Text>
        ) : null}

        {selectedId && latest ? (
          <Card style={styles.latest}>
            <Text style={[styles.kicker, { color: colors.blue }]}>Latest vitals</Text>
            <Text style={[styles.latestName, { color: colors.ink }]}>{latest.customer_name}</Text>
            <Text style={[styles.latestLine, { color: colors.ink }]}>{formatVitalsLine(latest.log.vitals_payload)}</Text>
            <Text style={[styles.meta, { color: colors.inkMuted }]}>
              {formatVisitWhen(latest.log.visit_timestamp)} · {latest.worker_name} · {latest.address}
            </Text>
            {visitAlert(latest).flags.length ? (
              <Text style={[styles.meta, { color: colors.warning }]}>{visitAlert(latest).severity}: {visitAlert(latest).flags.join(", ")}</Text>
            ) : (
              <Text style={[styles.meta, { color: colors.success }]}>No clinical flags</Text>
            )}
            <View style={styles.vitalGrid}>
              {latestRows.map((row) => (
                <View key={row.label} style={[styles.vitalCell, { borderColor: colors.line }]}>
                  <Text style={[styles.vitalLabel, { color: colors.inkMuted }]}>{row.label}</Text>
                  <Text style={[styles.vitalValue, { color: colors.ink }]}>{row.value}</Text>
                </View>
              ))}
            </View>
            <Button label="Open this visit" onPress={() => router.push(`/visits/${latest.log.log_id}`)} />
          </Card>
        ) : selectedId && logsQuery.isSuccess ? (
          <Card>
            <Text style={[styles.latestName, { color: colors.ink }]}>No visit logs yet</Text>
            <Text style={[styles.meta, { color: colors.inkMuted }]}>
              New vitals will appear here after a Care Giver submits a home visit.
            </Text>
          </Card>
        ) : null}

        {selectedId && logs.length > 1 ? (
          <Text style={[styles.section, { color: colors.ink }]}>Earlier visits</Text>
        ) : null}
        <CardGrid>
          {logs.slice(1).map((visit) => {
            const alert = visitAlert(visit);
            return (
              <Card key={visit.log.log_id} style={styles.historyCard}>
                <Text style={[styles.historyName, { color: colors.ink }]}>{visit.customer_name}</Text>
                <Text style={[styles.historyVitals, { color: colors.ink }]}>{formatVitalsLine(visit.log.vitals_payload)}</Text>
                <Text style={[styles.meta, { color: colors.inkMuted }]}>
                  {formatVisitWhen(visit.log.visit_timestamp)} · {visit.worker_name}
                </Text>
                {alert.flags.length ? (
                  <Text style={[styles.meta, { color: colors.warning }]}>{alert.severity}</Text>
                ) : null}
                <Button
                  label="View details"
                  size="compact"
                  onPress={() => router.push(`/visits/${visit.log.log_id}`)}
                />
              </Card>
            );
          })}
        </CardGrid>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { borderWidth: 2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily, fontSize: 15, fontWeight: "700" },
  kicker: { fontFamily, fontSize: 14, fontWeight: "700", textTransform: "uppercase" },
  latest: { gap: 10 },
  latestName: { fontFamily, fontSize: 24, fontWeight: "800" },
  latestLine: { fontFamily, fontSize: 22, fontWeight: "700" },
  section: { fontFamily, fontSize: 20, fontWeight: "800" },
  historyCard: { gap: 8 },
  historyName: { fontFamily, fontSize: 20, fontWeight: "800" },
  historyVitals: { fontFamily, fontSize: 18, fontWeight: "700" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
  vitalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vitalCell: { borderWidth: 1, borderRadius: 8, padding: 10, minWidth: "47%", flexGrow: 1 },
  vitalLabel: { fontFamily, fontSize: 14 },
  vitalValue: { fontFamily, fontSize: 18, fontWeight: "700", marginTop: 4 },
});
