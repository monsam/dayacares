import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { listSchedules } from "../../src/api/schedules";
import { formatVisitTime, localDateStamp, visitTypeLabel } from "../../src/lib/scheduleDisplay";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, space, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";

export default function WorkerScheduleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const date = localDateStamp();
  const query = useQuery({
    queryKey: ["schedules", date],
    queryFn: () => listSchedules(date),
    retry: 1,
  });
  const visits = (query.data?.schedules ?? []).filter((visit) => visit.status !== "CANCELLED");

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.nav, { backgroundColor: colors.navy }]}>
        <Pressable onPress={() => router.push("/home")} accessibilityRole="button">
          <Text style={styles.navBack}>Home</Text>
        </Pressable>
        <Text style={styles.navTitle}>Today</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Your route for {date}. Stops are in time order with the address for each Care Recipient.
        </Text>
        {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading today’s visits…</Text> : null}
        {query.isError ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]}>Could not load the schedule. Is the API running?</Text>
        ) : null}
        {query.data && visits.length === 0 ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]}>No visits booked for you today.</Text>
        ) : null}
        {visits.map((visit, index) => (
          <Card key={visit.schedule_id} style={styles.card}>
            <Text style={[styles.kicker, { color: colors.blue }]}>
              Stop {index + 1} · {formatVisitTime(visit.scheduled_for)} · {visitTypeLabel(visit.visit_type)}
            </Text>
            <Text style={[styles.name, { color: colors.ink }]}>{visit.customer_name}</Text>
            <Text style={[styles.meta, { color: colors.inkMuted }]}>{visit.customer_address}</Text>
            <Text style={[styles.meta, { color: colors.inkMuted }]}>{visit.duration_minutes} minutes</Text>
            {visit.notes ? <Text style={[styles.meta, { color: colors.inkMuted }]}>{visit.notes}</Text> : null}
            {visit.visit_type === "WELFARE_CALL" ? null : (
              <Button label="Start visit" onPress={() => router.push(`/worker/visit/${visit.customer_id}`)} />
            )}
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
  card: { gap: 8 },
  kicker: { fontFamily, fontSize: 16, fontWeight: "800" },
  name: { fontFamily, fontSize: 22, fontWeight: "800" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
});
