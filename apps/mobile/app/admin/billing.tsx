import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BillingAccount, SubscriptionStatus } from "@daya/shared";
import { currentPeriodLabel, formatInr } from "@daya/shared";
import { createInvoice, getBillingBoard, updateInvoice, updateSubscription } from "../../src/api/billing";
import { useAuth } from "../../src/auth/AuthContext";
import { apiErrorMessage } from "../../src/lib/scheduleDisplay";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { Chip } from "../../src/ui/Chip";
import { CardGrid, PageShell } from "../../src/ui/Page";

const STATUSES: SubscriptionStatus[] = ["ACTIVE", "PAUSED", "INACTIVE"];

export default function BillingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, ready } = useAuth();
  const [error, setError] = useState<string>();

  const query = useQuery({
    queryKey: ["billing"],
    queryFn: getBillingBoard,
    enabled: session?.role === "ADMIN",
    retry: 1,
  });

  useEffect(() => {
    if (ready && session?.role !== "ADMIN") {
      router.replace(session ? "/home" : "/");
    }
  }, [ready, session, router]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["billing"] });
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
    await queryClient.invalidateQueries({ queryKey: ["home"] });
  };

  const charge = useMutation({
    mutationFn: (customerId: string) => createInvoice({ customer_id: customerId }),
    onSuccess: async () => {
      setError(undefined);
      await refresh();
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not add the invoice.")),
  });

  const pay = useMutation({
    mutationFn: ({ invoiceId, status }: { invoiceId: string; status: "PAID" | "WAIVED" }) =>
      updateInvoice(invoiceId, { status, payment_mode: status === "PAID" ? "UPI" : undefined }),
    onSuccess: async () => {
      setError(undefined);
      await refresh();
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not update the invoice.")),
  });

  const subscribe = useMutation({
    mutationFn: ({ customerId, status }: { customerId: string; status: SubscriptionStatus }) =>
      updateSubscription(customerId, status),
    onSuccess: async () => {
      setError(undefined);
      await refresh();
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not update the plan status.")),
  });

  const board = query.data;
  const period = currentPeriodLabel();
  const busy = charge.isPending || pay.isPending || subscribe.isPending;

  return (
    <PageShell
      title="Billing"
      lead={
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Membership fees by plan: Essential {formatInr(2999)}, Enhanced {formatInr(4999)}, Comprehensive {formatInr(7999)}.
        </Text>
      }
    >
        {board ? (
          <Text style={[styles.heading, { color: colors.ink }]}>
            {board.due_count} due · {formatInr(board.due_inr)}
          </Text>
        ) : null}
        {error ? <Text style={[styles.meta, { color: colors.danger }]}>{error}</Text> : null}
        {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading billing…</Text> : null}
        {query.isError ? (
          <Text style={[styles.meta, { color: colors.danger }]}>Could not load billing. Try again in a moment.</Text>
        ) : null}

        <CardGrid>
          {board?.accounts.map((account) => (
            <AccountCard
              key={account.customer_id}
              account={account}
              period={period}
              busy={busy}
              onStatus={(status) => subscribe.mutate({ customerId: account.customer_id, status })}
              onCharge={() => charge.mutate(account.customer_id)}
              onPay={(invoiceId, status) => pay.mutate({ invoiceId, status })}
            />
          ))}
        </CardGrid>
    </PageShell>
  );
}

function AccountCard({
  account,
  period,
  busy,
  onStatus,
  onCharge,
  onPay,
}: {
  account: BillingAccount;
  period: string;
  busy: boolean;
  onStatus: (status: SubscriptionStatus) => void;
  onCharge: () => void;
  onPay: (invoiceId: string, status: "PAID" | "WAIVED") => void;
}) {
  const { colors } = useTheme();
  const hasPeriod = account.invoices.some((invoice) => invoice.period_label === period);
  return (
    <Card style={styles.card}>
      <Text style={[styles.heading, { color: colors.ink }]}>{account.name}</Text>
      <Text style={[styles.meta, { color: colors.blue }]}>
        {account.plan ?? "Plan"} · {formatInr(account.monthly_fee_inr)} / month
        {account.due_inr ? ` · due ${formatInr(account.due_inr)}` : " · paid up"}
      </Text>
      <Text style={[styles.meta, { color: colors.inkMuted }]}>{account.address}</Text>
      <View style={styles.chips}>
        {STATUSES.map((status) => (
          <Chip
            key={status}
            label={status}
            selected={account.subscription_status === status}
            disabled={busy}
            onPress={() => onStatus(status)}
          />
        ))}
      </View>
      {account.invoices.map((invoice) => (
        <View key={invoice.invoice_id} style={styles.invoice}>
          <Text style={[styles.name, { color: colors.ink }]}>
            {invoice.period_label} · {formatInr(invoice.amount_inr)} · {invoice.status}
          </Text>
          <Text style={[styles.meta, { color: colors.inkMuted }]}>
            {invoice.description}
            {invoice.paid_on ? ` · paid ${invoice.paid_on}` : ` · due ${invoice.due_on}`}
            {invoice.payment_mode ? ` · ${invoice.payment_mode}` : ""}
          </Text>
          {invoice.status === "DUE" ? (
            <View style={styles.chips}>
              <Chip label="Mark paid" selected={false} disabled={busy} onPress={() => onPay(invoice.invoice_id, "PAID")} />
              <Chip label="Waive" selected={false} disabled={busy} onPress={() => onPay(invoice.invoice_id, "WAIVED")} />
            </View>
          ) : null}
        </View>
      ))}
      {!hasPeriod ? (
        <Button
          label={`Add ${period} fee`}
          variant="secondary"
          disabled={busy}
          onPress={onCharge}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  card: { gap: 10 },
  heading: { fontFamily, fontSize: 22, fontWeight: "800" },
  name: { fontFamily, fontSize: 18, fontWeight: "800" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  invoice: { gap: 4, paddingTop: 6 },
});
