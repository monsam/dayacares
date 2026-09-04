import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getVisitLog } from "../../api/visits";
import { useAuth } from "../../auth/AuthContext";
import { formatVisitWhen, observationRows, visitAlert, vitalRows } from "../../lib/visitDisplay";
import { monitoringRows } from "@daya/shared";
import { useTheme } from "../../theme/ThemeContext";
import { fontFamily, type } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { FORM_MAX, PageShell } from "../../ui/Page";
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
    <PageShell title="Visit details" backTo="/visits" backLabel="Visit history" maxWidth={FORM_MAX}>
        {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading visit…</Text> : null}
        {query.isError || !id ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]}>
            This visit is not available. Try again in a moment.
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
              {session?.role === "ADMIN" || session?.role === "WORKER" ? (
                <Button
                  label="Edit this visit"
                  variant="secondary"
                  onPress={() => router.push(`/visits/edit/${visit.log.log_id}`)}
                />
              ) : null}
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

            {session?.role === "ADMIN" ? (
              <ReportFormsCard customerId={visit.log.customer_id} logId={visit.log.log_id} />
            ) : null}

            {(() => {
              const basics = observationRows(visit.log.qualitative_observations).filter(
                (row) => !row.label.includes(" · "),
              );
              const monitoring = monitoringRows(visit.log.qualitative_observations.monitoring);
              const sections = [...new Set(monitoring.map((row) => row.section))];
              return (
                <>
                  {basics.length ? (
                    <>
                      <Text style={[styles.section, { color: colors.ink }]}>Care Giver notes</Text>
                      <Card style={styles.block}>
                        {basics.map((row) => (
                          <View key={row.label} style={styles.row}>
                            <Text style={[styles.label, { color: colors.inkMuted }]}>{row.label}</Text>
                            <Text style={[styles.value, { color: colors.ink }]}>{row.value}</Text>
                          </View>
                        ))}
                      </Card>
                    </>
                  ) : null}
                  {sections.map((section) => (
                    <View key={section}>
                      <Text style={[styles.section, { color: colors.ink }]}>{section}</Text>
                      <Card style={styles.block}>
                        {monitoring
                          .filter((row) => row.section === section)
                          .map((row) => (
                            <View key={`${section}-${row.label}`} style={styles.row}>
                              <Text style={[styles.label, { color: colors.inkMuted }]}>{row.label}</Text>
                              <Text style={[styles.value, { color: colors.ink }]}>{row.value}</Text>
                            </View>
                          ))}
                      </Card>
                    </View>
                  ))}
                </>
              );
            })()}
          </>
        ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  kicker: { fontFamily, fontSize: 14, fontWeight: "700", textTransform: "uppercase" },
  title: { fontFamily, fontSize: type.title, fontWeight: "800" },
  section: { fontFamily, fontSize: 20, fontWeight: "800", marginTop: 4 },
  row: { gap: 2, paddingVertical: 6 },
  label: { fontFamily, fontSize: 15 },
  value: { fontFamily, fontSize: type.body, fontWeight: "700", lineHeight: 26 },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
});
