import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { getNotification, markNotificationRead } from "../../api/notifications";
import { useAuth } from "../../auth/AuthContext";
import { formatVisitTime } from "../../lib/scheduleDisplay";
import { useTheme } from "../../theme/ThemeContext";
import { fontFamily, type } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { FORM_MAX, PageShell } from "../../ui/Page";

export function NotificationDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, ready } = useAuth();
  const { notificationId } = useLocalSearchParams<{ notificationId: string }>();
  const id = notificationId ?? "";

  useEffect(() => {
    if (ready && !session) {
      router.replace("/");
    }
  }, [ready, session, router]);

  const query = useQuery({
    queryKey: ["notification", id],
    queryFn: () => getNotification(id),
    enabled: Boolean(session && id),
    retry: 1,
  });

  const markRead = useMutation({
    mutationFn: () => markNotificationRead(id),
    onSuccess: async (item) => {
      queryClient.setQueryData(["notification", id], item);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (!id || !query.data || query.data.read_at) return;
    markRead.mutate();
    // Mark once when the notification first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, query.data?.notification_id, query.data?.read_at]);

  const item = query.data;
  const openHref =
    item?.related_type === "VISIT" && item.related_id
      ? `/visits/${item.related_id}`
      : item?.kind === "SOS" && session?.role === "ADMIN"
        ? "/admin/emergencies"
        : undefined;

  return (
    <PageShell title="Notification" backTo="/notifications" backLabel="Notifications" maxWidth={FORM_MAX}>
      {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading notification…</Text> : null}
      {query.isError || !id ? (
        <Text style={[styles.meta, { color: colors.danger }]}>This notification is not available.</Text>
      ) : null}

      {item ? (
        <Card style={styles.card}>
          <Text style={[styles.kicker, { color: item.kind === "SOS" ? colors.danger : colors.warning }]}>
            {item.kind === "SOS" ? "Emergency" : "Visit alert"} · {formatVisitTime(item.created_at)}
          </Text>
          <Text style={[styles.title, { color: colors.ink }]}>{item.title}</Text>
          <Text style={[styles.body, { color: colors.ink }]}>{item.body}</Text>
          <Text style={[styles.meta, { color: colors.inkMuted }]}>
            {item.read_at || markRead.isSuccess ? "Marked read" : "Unread"}
          </Text>
          {openHref ? (
            <Button
              label={item.kind === "SOS" ? "Open emergencies" : "Open this visit"}
              onPress={() => router.push(openHref)}
            />
          ) : null}
        </Card>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  kicker: { fontFamily, fontSize: 14, fontWeight: "700" },
  title: { fontFamily, fontSize: 24, fontWeight: "800" },
  body: { fontFamily, fontSize: type.body, lineHeight: 26 },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
});
