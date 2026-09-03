import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { RoutedMember, WorkerCaseload } from "@daya/shared";
import { assignWorker, getRoutingBoard, unassignWorker } from "../../src/api/routing";
import { useAuth } from "../../src/auth/AuthContext";
import { apiErrorMessage } from "../../src/lib/scheduleDisplay";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, space, type } from "../../src/theme/tokens";
import { Card } from "../../src/ui/Card";
import { Chip } from "../../src/ui/Chip";

export default function WorkerRoutingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, ready } = useAuth();
  const [error, setError] = useState<string>();

  const query = useQuery({
    queryKey: ["routing"],
    queryFn: getRoutingBoard,
    enabled: session?.role === "ADMIN",
    retry: 1,
  });

  useEffect(() => {
    if (ready && session?.role !== "ADMIN") {
      router.replace(session ? "/home" : "/");
    }
  }, [ready, session, router]);

  const assign = useMutation({
    mutationFn: ({ workerId, customerId }: { workerId: string; customerId: string }) =>
      assignWorker(workerId, customerId),
    onSuccess: async () => {
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: ["routing"] });
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not assign Care Giver.")),
  });

  const remove = useMutation({
    mutationFn: (allocationId: string) => unassignWorker(allocationId),
    onSuccess: async () => {
      setError(undefined);
      await queryClient.invalidateQueries({ queryKey: ["routing"] });
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not remove assignment.")),
  });

  const board = query.data;
  const busy = assign.isPending || remove.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.nav, { backgroundColor: colors.navy }]}>
        <Pressable onPress={() => router.push("/home")} accessibilityRole="button">
          <Text style={styles.navBack}>Home</Text>
        </Pressable>
        <Text style={styles.navTitle}>Routing</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Assign Care Givers to Care Recipients. Address is the route hint for the day’s schedule.
        </Text>
        <Pressable onPress={() => router.push("/admin/schedule")} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.blue }]}>Open Scheduling →</Text>
        </Pressable>
        {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading caseloads…</Text> : null}
        {query.isError ? (
          <Text style={[styles.meta, { color: colors.danger }]}>Could not load routing. Try again in a moment.</Text>
        ) : null}
        {error ? <Text style={[styles.meta, { color: colors.danger }]}>{error}</Text> : null}

        {board?.unassigned.length ? (
          <Card style={styles.card}>
            <Text style={[styles.heading, { color: colors.ink }]}>Unassigned</Text>
            <Text style={[styles.meta, { color: colors.inkMuted }]}>
              {board.unassigned.length} Care Recipient{board.unassigned.length === 1 ? "" : "s"} with no Care Giver
            </Text>
            {board.unassigned.map((member) => (
              <MemberRow
                key={member.customer_id}
                member={member}
                workers={board.workers}
                busy={busy}
                onAssign={(workerId) => assign.mutate({ workerId, customerId: member.customer_id })}
              />
            ))}
          </Card>
        ) : null}

        {board?.workers.map((worker) => (
          <Card key={worker.user_id} style={styles.card}>
            <Text style={[styles.heading, { color: colors.ink }]}>{worker.name}</Text>
            <Text style={[styles.meta, { color: colors.blue }]}>
              {worker.members.length} on caseload
              {worker.members.length ? ` · ${routeHint(worker.members)}` : ""}
            </Text>
            {worker.members.length === 0 ? (
              <Text style={[styles.meta, { color: colors.inkMuted }]}>No members routed to this Care Giver yet.</Text>
            ) : null}
            {worker.members.map((member) => (
              <MemberRow
                key={`${worker.user_id}-${member.customer_id}`}
                member={member}
                workers={board.workers}
                busy={busy}
                onAssign={(workerId) => assign.mutate({ workerId, customerId: member.customer_id })}
                onRemove={member.allocation_id ? () => remove.mutate(member.allocation_id as string) : undefined}
              />
            ))}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

function routeHint(members: RoutedMember[]) {
  const areas = [...new Set(members.map((member) => areaFromAddress(member.address)))];
  return areas.slice(0, 3).join(" → ");
}

function areaFromAddress(address: string) {
  return address.split("·")[0]?.trim() || address;
}

function MemberRow({
  member,
  workers,
  busy,
  onAssign,
  onRemove,
}: {
  member: RoutedMember;
  workers: WorkerCaseload[];
  busy: boolean;
  onAssign: (workerId: string) => void;
  onRemove?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.member}>
      <Text style={[styles.name, { color: colors.ink }]}>{member.name}</Text>
      <Text style={[styles.meta, { color: colors.inkMuted }]}>{member.address}</Text>
      <Text style={[styles.meta, { color: colors.blue }]}>
        {member.plan ?? "Plan"} · {member.subscription_status}
      </Text>
      <View style={styles.chips}>
        {workers.map((worker) => {
          const assignedHere = member.worker_id === worker.user_id;
          return (
            <Chip
              key={worker.user_id}
              label={assignedHere ? `Remove ${worker.name}` : worker.name}
              selected={assignedHere}
              disabled={busy}
              onPress={() => {
                if (assignedHere) onRemove?.();
                else onAssign(worker.user_id);
              }}
            />
          );
        })}
      </View>
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
  link: { fontFamily, fontSize: 16, fontWeight: "700" },
  card: { gap: 10 },
  heading: { fontFamily, fontSize: 22, fontWeight: "800" },
  name: { fontFamily, fontSize: 20, fontWeight: "800" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
  member: { gap: 6, paddingTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
