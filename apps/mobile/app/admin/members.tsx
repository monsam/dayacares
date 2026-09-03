import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { listCustomers } from "../../src/api/customers";
import { useAuth } from "../../src/auth/AuthContext";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { CardGrid, PageShell } from "../../src/ui/Page";

export default function MembersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, ready } = useAuth();
  const query = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
    enabled: session?.role === "ADMIN",
    retry: 1,
  });

  useEffect(() => {
    if (ready && session?.role !== "ADMIN") {
      router.replace(session ? "/home" : "/");
    }
  }, [ready, session, router]);

  return (
    <PageShell
      title="Members"
      lead={
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Registered Care Recipients. Use Register to add a member from the paper form.
        </Text>
      }
    >
      <Button label="Register Care Recipient" onPress={() => router.push("/admin/register")} />
      {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading members…</Text> : null}
      {query.isError ? (
        <Text style={[styles.meta, { color: colors.inkMuted }]}>Could not load members. Try again in a moment.</Text>
      ) : null}
      <CardGrid>
        {query.data?.map((member) => (
          <Card key={member.customer_id} style={styles.card}>
            <Text style={[styles.name, { color: colors.ink }]}>{member.name}</Text>
            <Text style={[styles.meta, { color: colors.inkMuted }]}>{member.address}</Text>
            <Text style={[styles.plan, { color: colors.blue }]}>
              {member.plan ?? "Plan"} · {member.subscription_status}
            </Text>
          </Card>
        ))}
      </CardGrid>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  card: { gap: 8 },
  name: { fontFamily, fontSize: 20, fontWeight: "700" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
  plan: { fontFamily, fontSize: 15, fontWeight: "600" },
});
