import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { VisitSchedule, VisitType } from "@daya/shared";
import { listCustomers, listWorkers } from "../../src/api/customers";
import { createSchedule, listSchedules, updateSchedule } from "../../src/api/schedules";
import { useAuth } from "../../src/auth/AuthContext";
import { apiErrorMessage, formatVisitTime, localDateStamp, visitTypeLabel } from "../../src/lib/scheduleDisplay";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, space, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { Chip } from "../../src/ui/Chip";
import { TextField } from "../../src/ui/TextField";

const VISIT_TYPES: VisitType[] = ["HOME_VISIT", "WELFARE_CALL", "FOLLOW_UP"];

export default function SchedulingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, ready } = useAuth();
  const [date, setDate] = useState(localDateStamp());
  const [customerId, setCustomerId] = useState<string>();
  const [workerId, setWorkerId] = useState<string>();
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("45");
  const [visitType, setVisitType] = useState<VisitType>("HOME_VISIT");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (ready && session?.role !== "ADMIN") {
      router.replace(session ? "/home" : "/");
    }
  }, [ready, session, router]);

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
    enabled: session?.role === "ADMIN",
  });
  const workers = useQuery({
    queryKey: ["workers"],
    queryFn: listWorkers,
    enabled: session?.role === "ADMIN",
  });
  const day = useQuery({
    queryKey: ["schedules", date],
    queryFn: () => listSchedules(date),
    enabled: session?.role === "ADMIN" && /^\d{4}-\d{2}-\d{2}$/.test(date),
    retry: 1,
  });

  const create = useMutation({
    mutationFn: () => {
      if (!customerId || !workerId) {
        throw new Error("Select a Care Recipient and a Care Giver.");
      }
      if (!/^\d{2}:\d{2}$/.test(time)) {
        throw new Error("Time must be HH:MM.");
      }
      return createSchedule({
        customer_id: customerId,
        worker_id: workerId,
        scheduled_for: `${date}T${time}:00`,
        duration_minutes: Number(duration) || 45,
        visit_type: visitType,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setError(undefined);
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["schedules"] });
      await queryClient.invalidateQueries({ queryKey: ["routing"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not schedule visit.")),
  });

  const cancel = useMutation({
    mutationFn: (scheduleId: string) => updateSchedule(scheduleId, { status: "CANCELLED" }),
    onSuccess: async () => {
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: ["schedules"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not cancel visit.")),
  });

  const routes = useMemo(() => groupRoutes(day.data?.schedules ?? []), [day.data?.schedules]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.nav, { backgroundColor: colors.navy }]}>
        <Pressable onPress={() => router.push("/home")} accessibilityRole="button">
          <Text style={styles.navBack}>Home</Text>
        </Pressable>
        <Text style={styles.navTitle}>Schedule</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Book home visits and welfare calls. Overlapping times for the same Care Giver are blocked.
        </Text>
        <Pressable onPress={() => router.push("/admin/routing")} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.blue }]}>Open Worker routing →</Text>
        </Pressable>
        <TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        {day.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading the day…</Text> : null}
        {day.isError ? (
          <Text style={[styles.meta, { color: colors.danger }]}>Could not load the schedule. Is the API running?</Text>
        ) : null}
        {error ? <Text style={[styles.meta, { color: colors.danger }]}>{error}</Text> : null}

        {routes.map((route) => (
          <Card key={route.workerId} style={styles.card}>
            <Text style={[styles.heading, { color: colors.ink }]}>{route.workerName}</Text>
            <Text style={[styles.meta, { color: colors.blue }]}>{route.stops.join(" → ")}</Text>
            {route.visits.map((visit) => (
              <View key={visit.schedule_id} style={styles.visit}>
                <Text style={[styles.name, { color: colors.ink }]}>
                  {formatVisitTime(visit.scheduled_for)} · {visit.customer_name}
                </Text>
                <Text style={[styles.meta, { color: colors.inkMuted }]}>
                  {visitTypeLabel(visit.visit_type)} · {visit.duration_minutes} min · {visit.customer_address}
                </Text>
                {visit.notes ? <Text style={[styles.meta, { color: colors.inkMuted }]}>{visit.notes}</Text> : null}
                {visit.status === "SCHEDULED" ? (
                  <Button
                    label="Cancel visit"
                    variant="secondary"
                    size="compact"
                    disabled={cancel.isPending}
                    onPress={() => cancel.mutate(visit.schedule_id)}
                  />
                ) : (
                  <Text style={[styles.meta, { color: colors.inkMuted }]}>{visit.status}</Text>
                )}
              </View>
            ))}
          </Card>
        ))}

        {day.data && day.data.schedules.length === 0 ? (
          <Text style={[styles.meta, { color: colors.inkMuted }]}>No visits on this date yet.</Text>
        ) : null}

        <Card style={styles.card}>
          <Text style={[styles.heading, { color: colors.ink }]}>Add visit</Text>
          <Text style={[styles.section, { color: colors.ink }]}>Care Recipient</Text>
          <View style={styles.chips}>
            {(customers.data ?? []).map((member) => (
              <Chip
                key={member.customer_id}
                label={member.name}
                selected={customerId === member.customer_id}
                onPress={() => setCustomerId(member.customer_id)}
              />
            ))}
          </View>
          <Text style={[styles.section, { color: colors.ink }]}>Care Giver</Text>
          <View style={styles.chips}>
            {(workers.data ?? []).map((worker) => (
              <Chip
                key={worker.user_id}
                label={worker.name}
                selected={workerId === worker.user_id}
                onPress={() => setWorkerId(worker.user_id)}
              />
            ))}
          </View>
          <TextField label="Start time" value={time} onChangeText={setTime} placeholder="HH:MM" />
          <TextField label="Duration (minutes)" value={duration} onChangeText={setDuration} keyboardType="numeric" />
          <Text style={[styles.section, { color: colors.ink }]}>Visit type</Text>
          <View style={styles.chips}>
            {VISIT_TYPES.map((item) => (
              <Chip
                key={item}
                label={visitTypeLabel(item)}
                selected={visitType === item}
                onPress={() => setVisitType(item)}
              />
            ))}
          </View>
          <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Vitals, medication, family update…" />
          <Button
            label={create.isPending ? "Saving…" : "Schedule visit"}
            disabled={create.isPending}
            onPress={() => {
              setError(undefined);
              create.mutate();
            }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function groupRoutes(schedules: VisitSchedule[]) {
  const open = schedules.filter((visit) => visit.status !== "CANCELLED");
  const byWorker = new Map<string, VisitSchedule[]>();
  for (const visit of open) {
    const list = byWorker.get(visit.worker_id) ?? [];
    list.push(visit);
    byWorker.set(visit.worker_id, list);
  }
  return [...byWorker.entries()].map(([workerId, visits]) => {
    const ordered = [...visits].sort(
      (left, right) => new Date(left.scheduled_for).getTime() - new Date(right.scheduled_for).getTime(),
    );
    return {
      workerId,
      workerName: ordered[0]?.worker_name ?? workerId,
      visits: ordered,
      stops: ordered.map((visit) => `${formatVisitTime(visit.scheduled_for)} ${visit.customer_name}`),
    };
  });
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
  page: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  link: { fontFamily, fontSize: 16, fontWeight: "700" },
  card: { gap: 10 },
  heading: { fontFamily, fontSize: 22, fontWeight: "800" },
  section: { fontFamily, fontSize: 18, fontWeight: "800" },
  name: { fontFamily, fontSize: 18, fontWeight: "800" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
  visit: { gap: 6, paddingTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
