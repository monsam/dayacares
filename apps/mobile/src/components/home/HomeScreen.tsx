import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import type { HomeSummaryResponse, HomeVisitSummary } from "@daya/shared";
import { getHomeSummary } from "../../api/home";
import { createSos } from "../../api/sos";
import { useAuth } from "../../auth/AuthContext";
import { caregiverEmails, openCaregiverMailto } from "../../lib/messageEmail";
import { apiErrorMessage, EMPTY_CARE_FOCUS, formatVisitTime, LOAD_FAILED, LOADING_COPY, visitTypeLabel } from "../../lib/scheduleDisplay";
import { formatVitalsLine } from "../../lib/visitDisplay";
import { fontFamily } from "../../theme/tokens";
import { AppHeader } from "../../ui/AppHeader";
import { Button } from "../../ui/Button";
import { TextField } from "../../ui/TextField";
import { chromeForAccount, type HomeFeedItem } from "./roleHome";

export function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 960;
  const { session, ready } = useAuth();
  const queryClient = useQueryClient();
  const [sosState, setSosState] = useState<"idle" | "confirm" | "sending" | "sent" | "error">("idle");
  const [sosNote, setSosNote] = useState("");
  const [mailOpen, setMailOpen] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailError, setMailError] = useState("");

  const summary = useQuery({
    queryKey: ["home", session?.username],
    queryFn: getHomeSummary,
    enabled: Boolean(session),
    retry: 1,
  });

  useEffect(() => {
    if (ready && !session) {
      router.replace("/");
    }
  }, [ready, session, router]);

  if (!session) {
    return null;
  }

  const home = chromeForAccount(session);
  const feed = feedFromSummary(summary.data, session.role);

  const sendSos = () => {
    setSosState("sending");
    createSos({
      customer_id: summary.data?.customers[0]?.customer_id,
      severity: "SOS",
    })
      .then((incident) => {
        queryClient.invalidateQueries({ queryKey: ["home"] });
        queryClient.invalidateQueries({ queryKey: ["sos"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        setSosNote(`${incident.customer_name ?? "The centre"} has been alerted.`);
        setSosState("sent");
      })
      .catch((err) => {
        setSosNote(apiErrorMessage(err, "Could not send SOS. Call 0343 240 0000."));
        setSosState("error");
      });
  };

  const sendMail = () => {
    setMailError("");
    openCaregiverMailto(mailTo, mailSubject, mailBody).catch(() => {
      setMailError("Could not open your email app. Copy the address and send from there.");
    });
  };

  const onAction = (route: string) => {
    if (route === "sos") {
      setSosState("confirm");
      setSosNote("");
      setMailOpen(false);
      return;
    }
    if (route === "message") {
      setMailTo(caregiverEmails(summary.data?.team));
      setMailSubject(`Daya Cares message from ${session.name}`);
      setMailBody("");
      setMailError("");
      setMailOpen(true);
      setSosState("idle");
      return;
    }
    router.push(route);
  };

  return (
    <View style={styles.root}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={[styles.wave, styles.waveTop]} />
          <View style={[styles.wave, styles.waveBottom]} />
          <Text style={styles.welcome}>{home.greeting}</Text>
          <Text style={styles.welcomeSub}>{home.subtitle}</Text>
          {sosState !== "idle" ? (
            <View style={styles.sosBanner}>
              {sosState === "confirm" || sosState === "sending" ? (
                <>
                  <Text style={styles.sosTitle}>Send an emergency SOS?</Text>
                  <Text style={styles.sosBody}>
                    This alerts the Durgapur centre and the linked Care Family.
                  </Text>
                  <View style={styles.sosActions}>
                    <Button
                      label={sosState === "sending" ? "Sending…" : "Send SOS"}
                      size="compact"
                      disabled={sosState === "sending"}
                      onPress={sendSos}
                      pressOnDown
                    />
                    <Button
                      label="Cancel"
                      size="compact"
                      variant="secondary"
                      disabled={sosState === "sending"}
                      onPress={() => setSosState("idle")}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sosTitle}>{sosState === "sent" ? "SOS sent" : "Could not send SOS"}</Text>
                  <Text style={styles.sosBody}>{sosNote}</Text>
                  <Button label="Close" size="compact" variant="secondary" onPress={() => setSosState("idle")} />
                </>
              )}
            </View>
          ) : null}
          {mailOpen ? (
            <View style={styles.mailBanner}>
              <Text style={styles.sosTitle}>Send a message</Text>
              <Text style={styles.sosBody}>
                Opens your email app to the assigned Care Giver. Leave To blank if no address is on file.
              </Text>
              <TextField
                compact
                label="To"
                value={mailTo}
                onChangeText={setMailTo}
                keyboardType="email-address"
                placeholder="Care Giver email"
                helper={mailTo ? undefined : "No Care Giver email on this account."}
              />
              <TextField compact label="Subject" value={mailSubject} onChangeText={setMailSubject} />
              <Text style={styles.mailLabel}>Message</Text>
              <TextInput
                value={mailBody}
                onChangeText={setMailBody}
                multiline
                placeholder="Write your message"
                style={styles.mailBody}
              />
              {mailError ? <Text style={styles.mailError}>{mailError}</Text> : null}
              <View style={styles.sosActions}>
                <Button label="Send email" size="compact" onPress={sendMail} pressOnDown />
                <Button label="Cancel" size="compact" variant="secondary" onPress={() => setMailOpen(false)} />
              </View>
            </View>
          ) : null}
          <View style={[styles.actionRow, !isWide && styles.actionRowWrap]}>
            {home.actions.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => onAction(action.route)}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}
              >
                <Ionicons name={action.icon} size={28} color="#0057B8" />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.body, isWide ? styles.bodyWide : styles.bodyNarrow]}>
          <View style={styles.feed}>
            <View style={styles.feedCard}>
              {summary.isLoading ? (
                <Text style={styles.empty}>{LOADING_COPY}</Text>
              ) : summary.isError ? (
                <Text style={styles.empty}>{LOAD_FAILED}</Text>
              ) : (
                feed.map((item, index) => (
                  <View key={`${item.title}-${index}`}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <FeedRow
                      icon={<FeedIcon name={item.icon} />}
                      kicker={item.kicker}
                      title={item.title}
                      body={item.body}
                      primary={item.primary}
                      secondary={item.secondary}
                      onPrimary={() => onAction(item.primaryRoute)}
                      onSecondary={item.secondaryRoute ? () => onAction(item.secondaryRoute!) : undefined}
                    />
                  </View>
                ))
              )}
              <Pressable
                style={styles.viewAll}
                accessibilityRole="link"
                onPress={() => onAction("/visits")}
              >
                <Ionicons name="shield-checkmark" size={16} color="#0057B8" />
                <Text style={styles.viewAllText}>View all visit history</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>{home.sidebarTitle}</Text>
            {(summary.data?.team ?? []).map((person) => (
              <View key={person.user_id} style={styles.person}>
                <View style={styles.personAvatar}>
                  <Text style={styles.personInitials}>{person.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.personRole}>{person.role_label}</Text>
                </View>
              </View>
            ))}
            {summary.data && summary.data.team.length === 0 ? (
              <Text style={styles.empty}>{EMPTY_CARE_FOCUS}</Text>
            ) : null}
            <Pressable accessibilityRole="link" onPress={() => onAction(home.sidebarRoute)}>
              <Text style={styles.sidebarLink}>{home.sidebarLink}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function visitRoute(visit: HomeVisitSummary) {
  return `/visits/${visit.log.log_id}`;
}

function feedFromSummary(
  summary: HomeSummaryResponse | undefined,
  role: string,
): HomeFeedItem[] {
  if (!summary) return [];

  const scheduleRoute = role === "ADMIN" ? "/admin/schedule" : role === "WORKER" ? "/worker/schedule" : "/visits";
  const items: HomeFeedItem[] = [
    {
      icon: "users",
      kicker: "Care Focus",
      title:
        summary.customers.length === 1
          ? summary.customers[0].name
          : `${summary.customers.length} people on this account`,
      body:
        summary.customers.length === 0
          ? EMPTY_CARE_FOCUS
          : summary.customers.map((customer) => `${customer.name} · ${customer.address}`).join("\n"),
      primary: role === "WORKER" ? "Open list" : "View history",
      primaryRoute: role === "WORKER" ? "/worker/clients" : "/visits",
    },
  ];

  if (summary.open_sos?.length) {
    const first = summary.open_sos[0];
    items.unshift({
      icon: "alert",
      kicker: "Emergencies",
      title: `${first.customer_name ?? "SOS"} · ${first.status}`,
      body: summary.open_sos
        .map((incident) => `${incident.customer_name ?? "SOS"} · ${incident.severity} · ${incident.status}`)
        .join("\n"),
      primary: role === "ADMIN" ? "Open emergencies" : "View history",
      primaryRoute: role === "ADMIN" ? "/admin/emergencies" : "/visits",
    });
  }

  if (summary.schedules?.length) {
    const next = summary.schedules[0];
    items.unshift({
      icon: "calendar",
      kicker: "Upcoming visits",
      title: `${formatVisitTime(next.scheduled_for)} · ${next.customer_name}`,
      body: summary.schedules
        .map(
          (visit) =>
            `${formatVisitTime(visit.scheduled_for)} ${visit.customer_name} · ${visitTypeLabel(visit.visit_type)} · ${visit.worker_name}`,
        )
        .join("\n"),
      primary: role === "WORKER" ? "Open today's route" : "Open schedule",
      primaryRoute: scheduleRoute,
    });
  }

  if (summary.logs.length === 0) {
    items.push({
      icon: "ok",
      kicker: "Updates",
      title: "No visit logs yet",
      body: "New vitals will appear here after a Care Giver submits a visit.",
      primary: role === "WORKER" ? "Start a visit" : "View history",
      primaryRoute: role === "WORKER" ? "/worker/clients" : "/visits",
    });
    return items;
  }

  for (const visit of summary.logs) {
    const when = new Date(visit.log.visit_timestamp).toLocaleString();
    items.push({
      icon: "health",
      kicker: visit.customer_name,
      title: formatVitalsLine(visit.log.vitals_payload),
      body: `Recorded by ${visit.worker_name} on ${when}.`,
      primary: "View details",
      primaryRoute: visitRoute(visit),
    });
  }

  return items;
}

function FeedIcon({ name }: { name: HomeFeedItem["icon"] }) {
  if (name === "ok") return <Ionicons name="checkmark-circle" size={22} color="#2E7D57" />;
  if (name === "calendar") return <Ionicons name="calendar-outline" size={22} color="#0057B8" />;
  if (name === "health") return <MaterialCommunityIcons name="heart-pulse" size={22} color="#0057B8" />;
  if (name === "billing") return <Ionicons name="card-outline" size={22} color="#0057B8" />;
  if (name === "users") return <Ionicons name="people-outline" size={22} color="#0057B8" />;
  return <Ionicons name="alert-circle" size={22} color="#B42318" />;
}

function FeedRow({
  icon,
  kicker,
  title,
  body,
  primary,
  secondary,
  onPrimary,
  onSecondary,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  body: string;
  primary: string;
  secondary?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  return (
    <View style={styles.feedRow}>
      <View style={styles.feedIcon}>{icon}</View>
      <View style={styles.feedCopy}>
        <Text style={styles.feedKicker}>{kicker}</Text>
        <Text style={styles.feedTitle}>{title}</Text>
        <Text style={styles.feedBody}>{body}</Text>
      </View>
      <View style={styles.feedActions}>
        <Button label={primary} size="compact" onPress={onPrimary} />
        {secondary ? (
          <Button label={secondary} size="compact" variant="secondary" onPress={onSecondary ?? onPrimary} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F7FB" },
  scroll: { paddingBottom: 40 },
  hero: {
    backgroundColor: "#E3F0FA",
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    overflow: "hidden",
  },
  wave: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  waveTop: { width: 520, height: 160, top: -80, left: -80 },
  waveBottom: { width: 640, height: 180, bottom: -100, right: -120 },
  welcome: {
    fontFamily,
    fontSize: 28,
    fontWeight: "600",
    color: "#1A2B4C",
  },
  welcomeSub: {
    fontFamily,
    fontSize: 15,
    color: "#5B6775",
    marginTop: 4,
    marginBottom: 22,
  },
  sosBanner: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E53935",
    borderRadius: 4,
    padding: 16,
    gap: 10,
    marginBottom: 18,
  },
  sosTitle: { fontFamily, fontSize: 16, fontWeight: "700", color: "#1A2433" },
  sosBody: { fontFamily, fontSize: 14, lineHeight: 20, color: "#5B6775" },
  sosActions: { gap: 10 },
  mailBanner: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0057B8",
    borderRadius: 4,
    padding: 16,
    gap: 10,
    marginBottom: 18,
    alignItems: "stretch",
  },
  mailLabel: { fontFamily, fontSize: 13, fontWeight: "600", color: "#1A2433" },
  mailBody: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#C5D4E4",
    borderRadius: 4,
    backgroundColor: "#EAF2FA",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily,
    fontSize: 14,
    color: "#1A2B4C",
    textAlignVertical: "top",
  },
  mailError: { fontFamily, fontSize: 13, color: "#C0392B" },
  actionRow: {
    width: "100%",
    maxWidth: 980,
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },
  actionRowWrap: { flexWrap: "wrap" },
  actionTile: {
    width: 132,
    minHeight: 108,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 8,
    shadowColor: "#1A2B4C",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionLabel: {
    fontFamily,
    fontSize: 13,
    fontWeight: "600",
    color: "#1A2B4C",
    textAlign: "center",
  },
  pressed: { opacity: 0.86 },
  body: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
  },
  bodyWide: { flexDirection: "row", alignItems: "flex-start" },
  bodyNarrow: { flexDirection: "column" },
  feed: { flex: 2 },
  feedCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5DEE7",
    borderRadius: 4,
    overflow: "hidden",
  },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  feedIcon: { width: 36, alignItems: "center" },
  feedCopy: { flex: 1, minWidth: 0 },
  feedKicker: { fontFamily, fontSize: 13, color: "#5B6775", marginBottom: 2 },
  feedTitle: { fontFamily, fontSize: 18, fontWeight: "700", color: "#1A2B4C" },
  feedBody: { fontFamily, fontSize: 14, lineHeight: 20, color: "#5B6775", marginTop: 4 },
  feedActions: { width: 168, gap: 8 },
  divider: { height: 1, backgroundColor: "#E4EAF1" },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  viewAllText: { fontFamily, fontSize: 14, fontWeight: "600", color: "#0057B8" },
  sidebar: {
    flex: 1,
    minWidth: 280,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D5DEE7",
    borderRadius: 4,
    padding: 18,
    gap: 14,
  },
  sidebarTitle: { fontFamily, fontSize: 16, fontWeight: "700", color: "#1A2B4C" },
  person: { flexDirection: "row", alignItems: "center", gap: 10 },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F1FB",
    alignItems: "center",
    justifyContent: "center",
  },
  personInitials: { fontFamily, fontSize: 13, fontWeight: "700", color: "#0057B8" },
  personName: { fontFamily, fontSize: 15, fontWeight: "700", color: "#1A2B4C" },
  personRole: { fontFamily, fontSize: 13, color: "#5B6775" },
  sidebarLink: { fontFamily, fontSize: 14, fontWeight: "600", color: "#0057B8", marginTop: 4 },
  empty: { fontFamily, fontSize: 14, color: "#5B6775", paddingHorizontal: 20, paddingVertical: 18 },
});
