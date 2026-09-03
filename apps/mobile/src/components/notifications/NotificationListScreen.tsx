import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { AppNotification } from "@daya/shared";
import { listNotifications } from "../../api/notifications";
import { useAuth } from "../../auth/AuthContext";
import { formatVisitTime } from "../../lib/scheduleDisplay";
import { useTheme } from "../../theme/ThemeContext";
import { fontFamily, type } from "../../theme/tokens";
import { Card } from "../../ui/Card";
import { CardGrid, PageShell } from "../../ui/Page";

function kindLabel(kind: AppNotification["kind"]) {
  return kind === "SOS" ? "Emergency" : "Visit alert";
}

export function NotificationListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, ready } = useAuth();

  useEffect(() => {
    if (ready && !session) {
      router.replace("/");
    }
  }, [ready, session, router]);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    enabled: Boolean(session),
    retry: 1,
  });

  const items = query.data?.notifications ?? [];
  const unread = query.data?.unread_count ?? 0;

  return (
    <PageShell
      title="Notifications"
      backTo="/home"
      backLabel="Home"
      lead={
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          {unread ? `${unread} unread. ` : "All caught up. "}
          SOS alerts and urgent visit flags for people linked to this login.
        </Text>
      }
    >
      {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading notifications…</Text> : null}
      {query.isError ? (
        <Text style={[styles.meta, { color: colors.danger }]}>Could not load notifications. Try again in a moment.</Text>
      ) : null}
      {!query.isLoading && !items.length ? (
        <Text style={[styles.meta, { color: colors.inkMuted }]}>No notifications yet.</Text>
      ) : null}

      <CardGrid>
        {items.map((item) => (
          <Pressable
            key={item.notification_id}
            onPress={() => router.push(`/notifications/${item.notification_id}`)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <Card style={styles.card}>
              <Text style={[styles.kicker, { color: item.read_at ? colors.inkMuted : colors.danger }]}>
                {item.read_at ? "Read" : "Unread"} · {kindLabel(item.kind)} · {formatVisitTime(item.created_at)}
              </Text>
              <Text style={[styles.title, { color: colors.ink }]}>{item.title}</Text>
              <Text style={[styles.meta, { color: colors.inkMuted }]} numberOfLines={3}>
                {item.body}
              </Text>
            </Card>
          </Pressable>
        ))}
      </CardGrid>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  card: { gap: 8 },
  kicker: { fontFamily, fontSize: 14, fontWeight: "700" },
  title: { fontFamily, fontSize: 20, fontWeight: "800" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
});
