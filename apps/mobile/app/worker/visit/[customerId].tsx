import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { getCustomer } from "../../../src/api/customers";
import { useAuth } from "../../../src/auth/AuthContext";
import { GuidedVitalsForm } from "../../../src/components/vitals/GuidedVitalsForm";
import { useTheme } from "../../../src/theme/ThemeContext";
import { PageChrome } from "../../../src/ui/Page";

export default function VisitScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const id = customerId ?? "";
  const query = useQuery({
    queryKey: ["customer", id],
    queryFn: () => getCustomer(id),
    enabled: Boolean(id),
    retry: 1,
  });

  return (
    <PageChrome>
      {query.isLoading ? (
        <Text style={{ padding: 24, color: colors.inkMuted }}>Loading Care Focus…</Text>
      ) : null}
      {query.isError || !id ? (
        <Text style={{ padding: 24, color: colors.inkMuted }}>
          Could not load this Care Focus. Try again in a moment.
        </Text>
      ) : null}
      {query.data ? (
        <GuidedVitalsForm
          customerId={query.data.customer_id}
          customerName={query.data.name}
          address={query.data.address}
          workerName={session?.name ?? "Care Giver"}
          plan={query.data.plan}
        />
      ) : null}
    </PageChrome>
  );
}
