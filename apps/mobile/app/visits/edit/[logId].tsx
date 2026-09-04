import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";
import { getVisitLog } from "../../../src/api/visits";
import { useAuth } from "../../../src/auth/AuthContext";
import { GuidedVitalsForm } from "../../../src/components/vitals/GuidedVitalsForm";
import { useTheme } from "../../../src/theme/ThemeContext";
import { PageChrome } from "../../../src/ui/Page";

export default function EditVisitScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, ready } = useAuth();
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const id = logId ?? "";

  useEffect(() => {
    if (ready && session && session.role !== "ADMIN" && session.role !== "WORKER") {
      router.replace("/visits");
    }
  }, [ready, session, router]);

  const query = useQuery({
    queryKey: ["visit", id],
    queryFn: () => getVisitLog(id),
    enabled: Boolean(session && id),
    retry: 1,
  });

  return (
    <PageChrome>
      {query.isLoading ? <Text style={{ padding: 24, color: colors.inkMuted }}>Loading visit…</Text> : null}
      {query.isError || !id ? (
        <Text style={{ padding: 24, color: colors.inkMuted }}>This visit is not available.</Text>
      ) : null}
      {query.data ? (
        <GuidedVitalsForm
          customerId={query.data.log.customer_id}
          customerName={query.data.customer_name}
          address={query.data.address}
          workerName={session?.name ?? query.data.worker_name}
          existingLog={query.data}
        />
      ) : null}
    </PageChrome>
  );
}
