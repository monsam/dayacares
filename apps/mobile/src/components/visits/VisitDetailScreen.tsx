import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getVisitLog } from "../../api/visits";
import { useAuth } from "../../auth/AuthContext";
import { formatVisitWhen, observationRows, visitAlert, vitalRows } from "../../lib/visitDisplay";
import { useTheme } from "../../theme/ThemeContext";
import { fontFamily, space, type } from "../../theme/tokens";
import { Card } from "../../ui/Card";
import { ReportFormsCard } from "./ReportFormsCard";

export function VisitDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, ready } = useAuth();
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const id = logId ?? "";

  useEffect(() => {
    if (ready && !session) {
      router.replace("/");
    }
  }, [ready, session, router]);

  const query = useQuery({
    queryKey: ["visit", id],
    queryFn: () => getVisitLog(id),
    enabled: Boolean(session && id),
    retry: 1,
  });

  const visit = query.data;
  const alert = visit ? visitAlert(visit) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.nav, { backgroundColor: colors.navy }]}>
        <Pressable onPress={() => router.push("/visits")} accessibilityRole="button">
          <Text style={styles.navBack}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Visit details</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading visit from MySQL…</Text> : null}
        {query.isError || !id ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]}>
            This visit is not available, or the API is offline.
          </Text>
        ) : null}

        {visit ? (
          <>
            <Card style={styles.block}>
              <Text style={[styles.kicker, { color: colors.blue }]}>{visit.customer_name}</Text>
              <Text style={[styles.title, { color: colors.ink }]}>{formatVisitWhen(visit.log.visit_timestamp)}</Text>
              <Text style={[styles.meta, { color: colors.inkMuted }]}>
                Recorded by {visit.worker_name} · {visit.address}
              </Text>
              <Text style={[styles.meta, { color: colors.inkMuted }]}>Source {visit.log.entry_source.replaceAll("_", " ")}</Text>
              {alert?.flags.length ? (
                <Text style={[styles.meta, { color: colors.warning }]}>
                  {alert.severity}: {alert.flags.join(", ")}
                </Text>
              ) : (
                <Text style={[styles.meta, { color: colors.success }]}>No clinical flags</Text>
              )}
            </Card>

            <Text style={[styles.section, { color: colors.ink }]}>Vitals</Text>
            <Card style={styles.block}>
              {vitalRows(visit.log.vitals_payload).map((row) => (
                <View key={row.label} style={styles.row}>
                  <Text style={[styles.label, { color: colors.inkMuted }]}>{row.label}</Text>
                  <Text style={[styles.value, { color: colors.ink }]}>{row.value}</Text>
                </View>
              ))}
            </Card>

            <ReportFormsCard customerId={visit.log.customer_id} logId={visit.log.log_id} />

            {observationRows(visit.log.qualitative_observations).length ? (
              <>
                <Text style={[styles.section, { color: colors.ink }]}>Care Giver notes</Text>
                <Card style={styles.block}>
                  {observationRows(visit.log.qualitative_observations).map((row) => (
                    <View key={row.label} style={styles.row}>
                      <Text style={[styles.label, { color: colors.inkMuted }]}>{row.label}</Text>
                      <Text style={[styles.value, { color: colors.ink }]}>{row.value}</Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        ) : null}
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
  block: { gap: 8 },
  kicker: { fontFamily, fontSize: 14, fontWeight: "700", textTransform: "uppercase" },
  title: { fontFamily, fontSize: type.title, fontWeight: "800" },
  section: { fontFamily, fontSize: 20, fontWeight: "800", marginTop: 4 },
  row: { gap: 2, paddingVertical: 6 },
  label: { fontFamily, fontSize: 15 },
  value: { fontFamily, fontSize: type.body, fontWeight: "700", lineHeight: 26 },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
});
