import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SosIncident, SosSeverity } from "@daya/shared";
import { listCustomers, listWorkers } from "../../src/api/customers";
import { createSos, listSos, updateSos } from "../../src/api/sos";
import { useAuth } from "../../src/auth/AuthContext";
import { apiErrorMessage, formatVisitTime } from "../../src/lib/scheduleDisplay";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { Chip } from "../../src/ui/Chip";
import { CardGrid, PageShell } from "../../src/ui/Page";
import { TextField } from "../../src/ui/TextField";

const SEVERITIES: SosSeverity[] = ["SOS", "FALL", "MEDICAL", "OTHER"];

function severityLabel(value: SosSeverity) {
  if (value === "FALL") return "Fall";
  if (value === "MEDICAL") return "Medical";
  if (value === "OTHER") return "Other";
  return "SOS";
}

export default function EmergenciesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, ready } = useAuth();
  const [customerId, setCustomerId] = useState<string>();
  const [severity, setSeverity] = useState<SosSeverity>("SOS");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (ready && session?.role !== "ADMIN") {
      router.replace(session ? "/home" : "/");
    }
  }, [ready, session, router]);

  const incidents = useQuery({
    queryKey: ["sos"],
    queryFn: listSos,
    enabled: session?.role === "ADMIN",
    retry: 1,
  });
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

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["sos"] });
    await queryClient.invalidateQueries({ queryKey: ["home"] });
    await queryClient.invalidateQueries({ queryKey: ["routing"] });
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const raise = useMutation({
    mutationFn: () => {
      if (!customerId) throw new Error("Select a Care Recipient.");
      return createSos({ customer_id: customerId, severity, notes: notes.trim() || undefined });
    },
    onSuccess: async () => {
      setError(undefined);
      setNotes("");
      await refresh();
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not raise the emergency.")),
  });

  const patch = useMutation({
    mutationFn: ({ incidentId, ...body }: { incidentId: string } & Parameters<typeof updateSos>[1]) =>
      updateSos(incidentId, body),
    onSuccess: async () => {
      setError(undefined);
      await refresh();
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not update the emergency.")),
  });

  const open = (incidents.data ?? []).filter((item) => item.status === "OPEN");
  const other = (incidents.data ?? []).filter((item) => item.status !== "OPEN");

  return (
    <PageShell
      title="Emergencies"
      lead={
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Open SOS alerts from family, Care Focus, and Care Givers. Acknowledge, assign, then resolve.
        </Text>
      }
    >
        <Text style={[styles.heading, { color: colors.ink }]}>
          {open.length} open
        </Text>
        {error ? <Text style={[styles.meta, { color: colors.danger }]}>{error}</Text> : null}
        {incidents.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading emergencies…</Text> : null}
        {incidents.isError ? (
          <Text style={[styles.meta, { color: colors.danger }]}>Could not load emergencies. Try again in a moment.</Text>
        ) : null}

        <Card style={styles.card}>
          <Text style={[styles.heading, { color: colors.ink }]}>Raise an emergency</Text>
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
          <Text style={[styles.section, { color: colors.ink }]}>Type</Text>
          <View style={styles.chips}>
            {SEVERITIES.map((item) => (
              <Chip
                key={item}
                label={severityLabel(item)}
                selected={severity === item}
                onPress={() => setSeverity(item)}
              />
            ))}
          </View>
          <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="What happened, who is on scene…" />
          <Button
            label={raise.isPending ? "Sending…" : "Send SOS to the centre"}
            disabled={raise.isPending}
            onPress={() => {
              setError(undefined);
              raise.mutate();
            }}
          />
        </Card>

        <CardGrid>
          {open.map((incident) => (
            <IncidentCard
              key={incident.incident_id}
              incident={incident}
              workers={workers.data ?? []}
              busy={patch.isPending}
              onPatch={(body) => patch.mutate({ incidentId: incident.incident_id, ...body })}
            />
          ))}
          {other.map((incident) => (
            <IncidentCard
              key={incident.incident_id}
              incident={incident}
              workers={workers.data ?? []}
              busy={patch.isPending}
              onPatch={(body) => patch.mutate({ incidentId: incident.incident_id, ...body })}
            />
          ))}
        </CardGrid>
    </PageShell>
  );
}

function IncidentCard({
  incident,
  workers,
  busy,
  onPatch,
}: {
  incident: SosIncident;
  workers: { user_id: string; name: string }[];
  busy: boolean;
  onPatch: (body: Parameters<typeof updateSos>[1]) => void;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <Text style={[styles.kicker, { color: incident.status === "OPEN" ? colors.danger : colors.blue }]}>
        {incident.status} · {severityLabel(incident.severity)} · {formatVisitTime(incident.created_at)}
      </Text>
      <Text style={[styles.heading, { color: colors.ink }]}>
        {incident.customer_name ?? "Unlinked SOS"}
      </Text>
      {incident.customer_address ? (
        <Text style={[styles.meta, { color: colors.inkMuted }]}>{incident.customer_address}</Text>
      ) : null}
      <Text style={[styles.meta, { color: colors.inkMuted }]}>Raised by {incident.raised_by_name}</Text>
      {incident.notes ? <Text style={[styles.meta, { color: colors.inkMuted }]}>{incident.notes}</Text> : null}
      {incident.emergency_contacts.length ? (
        <Text style={[styles.meta, { color: colors.inkMuted }]}>
          Contacts:{" "}
          {incident.emergency_contacts
            .map((contact) => `${contact.name} ${contact.phone}`)
            .join(" · ")}
        </Text>
      ) : null}
      {incident.status !== "RESOLVED" ? (
        <>
          <Text style={[styles.section, { color: colors.ink }]}>Assign Care Giver</Text>
          <View style={styles.chips}>
            {workers.map((worker) => (
              <Chip
                key={worker.user_id}
                label={worker.name}
                selected={incident.assigned_worker_id === worker.user_id}
                disabled={busy}
                onPress={() => onPatch({ assigned_worker_id: worker.user_id })}
              />
            ))}
          </View>
          <View style={styles.chips}>
            {incident.status === "OPEN" ? (
              <Chip label="Acknowledge" disabled={busy} onPress={() => onPatch({ status: "ACKNOWLEDGED" })} />
            ) : null}
            <Chip label="Resolve" disabled={busy} onPress={() => onPatch({ status: "RESOLVED" })} />
          </View>
        </>
      ) : incident.assigned_worker_name ? (
        <Text style={[styles.meta, { color: colors.blue }]}>Closed by {incident.assigned_worker_name}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  card: { gap: 10 },
  heading: { fontFamily, fontSize: 22, fontWeight: "800" },
  section: { fontFamily, fontSize: 16, fontWeight: "800" },
  kicker: { fontFamily, fontSize: 16, fontWeight: "800" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
