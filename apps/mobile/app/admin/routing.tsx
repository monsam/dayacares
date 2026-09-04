import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { RoutedMember, WorkerCaseload } from "@daya/shared";
import { assignWorker, getRoutingBoard, setPrimaryWorker, unassignWorker } from "../../src/api/routing";
import { useAuth } from "../../src/auth/AuthContext";
import { apiErrorMessage } from "../../src/lib/scheduleDisplay";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, type } from "../../src/theme/tokens";
import { Card } from "../../src/ui/Card";
import { Chip } from "../../src/ui/Chip";
import { CardGrid, PageShell } from "../../src/ui/Page";

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
    <PageShell
      title="Routing"
      lead={
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Assign a primary Care Giver, keep daily capacity in view, and open the area map. Overlaps still block double-booking.
        </Text>
      }
    >
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

        <CardGrid>
          {board?.workers.map((worker) => (
            <Card key={worker.user_id} style={styles.card}>
              <Text style={[styles.heading, { color: colors.ink }]}>{worker.name}</Text>
              <Text style={[styles.meta, { color: colors.blue }]}>
                {worker.members.length} on caseload
                {worker.members.length ? ` · ${routeHint(worker.members)}` : ""}
                {` · ${worker.today_visits}/${worker.max_daily_visits} visits today`}
              </Text>
              {worker.members[0] ? (
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${worker.members[0].address}, Durgapur, India`)}`,
                    )
                  }
                >
                  <Text style={[styles.link, { color: colors.blue }]}>Open area map →</Text>
                </Pressable>
              ) : null}
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
                  onPrimary={
                    member.allocation_id && !member.is_primary
                      ? () => setPrimaryWorker(member.allocation_id as string).then(() => queryClient.invalidateQueries({ queryKey: ["routing"] }))
                      : undefined
                  }
                />
              ))}
            </Card>
          ))}
        </CardGrid>
    </PageShell>
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
  onPrimary,
}: {
  member: RoutedMember;
  workers: WorkerCaseload[];
  busy: boolean;
  onAssign: (workerId: string) => void;
  onRemove?: () => void;
  onPrimary?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.member}>
      <Text style={[styles.name, { color: colors.ink }]}>
        {member.name}
        {member.is_primary ? " · primary" : ""}
      </Text>
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
        {onPrimary ? <Chip label="Make primary" selected={false} disabled={busy} onPress={onPrimary} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  link: { fontFamily, fontSize: 16, fontWeight: "700" },
  card: { gap: 10 },
  heading: { fontFamily, fontSize: 22, fontWeight: "800" },
  name: { fontFamily, fontSize: 20, fontWeight: "800" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
  member: { gap: 6, paddingTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
