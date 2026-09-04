import type { ComponentProps } from "react";
import type { CareTeamPerson, HomeSummaryResponse, HomeVisitSummary, SessionUser, UserRole } from "@daya/shared";
import { deriveVisitAlert } from "@daya/shared";
import { ROLE_LABEL } from "../../auth/AuthContext";
import { EMPTY_CARE_FOCUS, formatVisitTime, visitTypeLabel } from "../../lib/scheduleDisplay";
import { formatVisitWhen, formatVitalsLine } from "../../lib/visitDisplay";

type IconName = ComponentProps<typeof import("@expo/vector-icons").Ionicons>["name"];

export interface HomeAction {
  key: string;
  label: string;
  icon: IconName;
  route: string;
}

export interface HomeFeedItem {
  icon: "ok" | "calendar" | "health" | "billing" | "users" | "alert";
  kicker: string;
  title: string;
  body: string;
  primary: string;
  secondary?: string;
  primaryRoute: string;
  secondaryRoute?: string;
}

export interface RoleChrome {
  greeting: string;
  subtitle: string;
  avatar: string;
  actions: HomeAction[];
  sidebarTitle: string;
  sidebarLink: string;
  sidebarRoute: string;
}

export function chromeForAccount(account: SessionUser): RoleChrome {
  const firstName = account.name.split(" ")[0];
  const avatar = account.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (account.role === "CUSTOMER") {
    return {
      greeting: `Welcome, ${firstName}`,
      subtitle: ROLE_LABEL.CUSTOMER,
      avatar,
      actions: [
        { key: "sos", label: "Emergency SOS", icon: "alert-circle", route: "sos" },
        { key: "health", label: "My health", icon: "heart", route: "/visits" },
        { key: "visits", label: "Visits", icon: "calendar", route: "/visits" },
        { key: "messages", label: "Messages", icon: "mail", route: "message" },
      ],
      sidebarTitle: "My care team",
      sidebarLink: "View visit history →",
      sidebarRoute: "/visits",
    };
  }

  if (account.role === "FAMILY") {
    return {
      greeting: `Welcome, ${firstName}`,
      subtitle: ROLE_LABEL.FAMILY,
      avatar,
      actions: [
        { key: "sos", label: "Emergency SOS", icon: "alert-circle", route: "sos" },
        { key: "health", label: "Health records", icon: "heart", route: "/visits" },
        { key: "visits", label: "Visit history", icon: "calendar", route: "/visits" },
        { key: "messages", label: "Messages", icon: "mail", route: "message" },
      ],
      sidebarTitle: "Linked Care Focus",
      sidebarLink: "View visit history →",
      sidebarRoute: "/visits",
    };
  }

  if (account.role === "ADMIN") {
    return {
      greeting: `Welcome, ${firstName}`,
      subtitle: ROLE_LABEL.ADMIN,
      avatar,
      actions: [
        { key: "users", label: "Members", icon: "people", route: "/admin/members" },
        { key: "routing", label: "Worker routing", icon: "navigate", route: "/admin/routing" },
        { key: "schedule", label: "Scheduling", icon: "calendar", route: "/admin/schedule" },
        { key: "reports", label: "Reports", icon: "stats-chart", route: "/visits" },
        { key: "billing", label: "Billing", icon: "card", route: "/admin/billing" },
        { key: "alerts", label: "Emergencies", icon: "alert-circle", route: "/admin/emergencies" },
      ],
      sidebarTitle: "Staff on shift",
      sidebarLink: "Manage users and roles →",
      sidebarRoute: "/admin/users",
    };
  }

  return {
    greeting: `Welcome, ${firstName}`,
    subtitle: ROLE_LABEL.WORKER,
    avatar,
    actions: [
      { key: "sos", label: "Emergency SOS", icon: "alert-circle", route: "sos" },
      { key: "visits", label: "Home visits", icon: "calendar", route: "/worker/clients" },
      { key: "schedule", label: "Today's route", icon: "navigate", route: "/worker/schedule" },
      { key: "health", label: "Visit results", icon: "heart", route: "/visits" },
      { key: "messages", label: "Messages", icon: "mail", route: "message" },
    ],
    sidebarTitle: "My Care Focus",
    sidebarLink: "Open Care Focus list →",
    sidebarRoute: "/worker/clients",
  };
}

export function sidebarForRole(role: UserRole, summary: HomeSummaryResponse | undefined): CareTeamPerson[] {
  if (!summary) return [];
  if (role === "ADMIN") return summary.team;
  if (role === "WORKER" || role === "FAMILY") {
    return summary.customers.map((customer) => ({
      user_id: customer.customer_id,
      name: customer.name,
      role_label: customer.address,
      initials: customer.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    }));
  }
  return summary.team.filter((person) => person.role !== "CUSTOMER");
}

export function feedForRole(role: UserRole, summary: HomeSummaryResponse | undefined): HomeFeedItem[] {
  if (!summary) return [];
  if (role === "ADMIN") return adminFeed(summary);
  if (role === "WORKER") return workerFeed(summary);
  if (role === "FAMILY") return familyFeed(summary);
  return customerFeed(summary);
}

function lastVisitItem(visit: HomeVisitSummary, routes: { primary: string; primaryRoute: string }): HomeFeedItem {
  const alert = deriveVisitAlert(visit.log.vitals_payload, visit.log.qualitative_observations);
  const when = formatVisitWhen(visit.log.visit_timestamp);
  const vitals = formatVitalsLine(visit.log.vitals_payload);
  if (alert.severity === "CRITICAL") {
    return {
      icon: "alert",
      kicker: "Last visit",
      title: `${visit.customer_name} needs attention`,
      body: `${vitals}. Recorded by ${visit.worker_name} on ${when}.`,
      ...routes,
    };
  }
  if (alert.severity === "WARNING") {
    return {
      icon: "health",
      kicker: "Last visit",
      title: `${visit.customer_name} may need a follow-up`,
      body: `${vitals}. Recorded by ${visit.worker_name} on ${when}.`,
      ...routes,
    };
  }
  return {
    icon: "ok",
    kicker: "Last visit",
    title: `All good · ${visit.customer_name}`,
    body: `${vitals}. ${visit.worker_name} recorded this on ${when}.`,
    ...routes,
  };
}

function adminFeed(summary: HomeSummaryResponse): HomeFeedItem[] {
  const active = summary.customers.filter((item) => item.subscription_status === "ACTIVE").length;
  const paused = summary.customers.filter((item) => item.subscription_status === "PAUSED").length;
  const visits = summary.schedules ?? [];
  const sos = summary.open_sos ?? [];

  return [
    {
      icon: "users",
      kicker: "Operations",
      title: `${summary.customers.length} Care Focus in Durgapur`,
      body:
        summary.customers.length === 0
          ? "No members yet. Register a Care Recipient to start routing."
          : `${active} active memberships${paused ? ` · ${paused} paused` : ""}. Open Members to register or review a person.`,
      primary: "Open Members",
      primaryRoute: "/admin/members",
    },
    {
      icon: "calendar",
      kicker: "Today's routing",
      title: visits.length
        ? `${visits.length} visit${visits.length === 1 ? "" : "s"} today`
        : "No visits on the board",
      body: visits.length
        ? visits
            .slice(0, 4)
            .map(
              (visit) =>
                `${formatVisitTime(visit.scheduled_for)} ${visit.customer_name} · ${visitTypeLabel(visit.visit_type)} · ${visit.worker_name}`,
            )
            .join("\n")
        : "Open Scheduling to book home visits and welfare calls.",
      primary: "Open schedule",
      primaryRoute: "/admin/schedule",
      secondary: "Assign workers",
      secondaryRoute: "/admin/routing",
    },
    {
      icon: sos.length ? "alert" : "ok",
      kicker: "Emergencies",
      title: sos.length ? `${sos.length} open` : "No open emergencies",
      body: sos.length
        ? sos
            .map((incident) => `${incident.customer_name ?? "SOS"} · ${incident.severity} · ${incident.status}`)
            .join("\n")
        : "New SOS tickets from Care Focus and family will appear here.",
      primary: "Open emergencies",
      primaryRoute: "/admin/emergencies",
    },
  ];
}

function workerFeed(summary: HomeSummaryResponse): HomeFeedItem[] {
  const items: HomeFeedItem[] = [];
  const route = summary.schedules ?? [];
  const sos = summary.open_sos ?? [];
  const nextStop = route[0];

  if (sos.length) {
    const first = sos[0];
    items.push({
      icon: "alert",
      kicker: "Assigned SOS",
      title: `${first.customer_name ?? "SOS"} · ${first.status}`,
      body: sos
        .map((incident) => `${incident.customer_name ?? "SOS"} · ${incident.severity} · ${incident.status}`)
        .join("\n"),
      primary: first.customer_id ? "Start visit" : "Open list",
      primaryRoute: first.customer_id ? `/worker/visit/${first.customer_id}` : "/worker/clients",
    });
  }

  items.push(
    nextStop
      ? {
          icon: "calendar",
          kicker: "Today's route",
          title: `Next: ${formatVisitTime(nextStop.scheduled_for)} · ${nextStop.customer_name}`,
          body: route
            .map(
              (visit) =>
                `${formatVisitTime(visit.scheduled_for)} ${visit.customer_name} · ${visitTypeLabel(visit.visit_type)} · ${visit.customer_address}`,
            )
            .join("\n"),
          primary: "Open route",
          primaryRoute: "/worker/schedule",
          secondary: "Start this visit",
          secondaryRoute: `/worker/visit/${nextStop.customer_id}`,
        }
      : {
          icon: "calendar",
          kicker: "Today's route",
          title: "No visits booked today",
          body:
            summary.customers.length === 0
              ? EMPTY_CARE_FOCUS
              : `${summary.customers.length} Care Focus assigned. Open the list if you need to record an unscheduled visit.`,
          primary: "Open list",
          primaryRoute: "/worker/clients",
        },
  );

  const latest = summary.logs[0];
  if (latest) {
    items.push(
      lastVisitItem(latest, {
        primary: "View this visit",
        primaryRoute: `/visits/${latest.log.log_id}`,
      }),
    );
  } else {
    items.push({
      icon: "ok",
      kicker: "Last visit",
      title: "No visit recorded yet",
      body: "After you submit a home visit, the latest result will show here.",
      primary: "Open list",
      primaryRoute: "/worker/clients",
    });
  }

  return items;
}

function customerFeed(summary: HomeSummaryResponse): HomeFeedItem[] {
  const items: HomeFeedItem[] = [];
  const sos = summary.open_sos ?? [];
  const next = (summary.schedules ?? [])[0];
  const latest = summary.logs[0];
  const me = summary.customers[0];

  if (sos.length) {
    items.push({
      icon: "alert",
      kicker: "Your SOS",
      title: `${sos[0].status === "OPEN" ? "The centre has your alert" : sos[0].status}`,
      body: sos
        .map((incident) => `${incident.severity} · ${incident.status}${incident.notes ? ` · ${incident.notes}` : ""}`)
        .join("\n"),
      primary: "View history",
      primaryRoute: "/visits",
    });
  }

  if (latest) {
    items.push(
      lastVisitItem(latest, {
        primary: "My health",
        primaryRoute: "/visits",
      }),
    );
  } else {
    items.push({
      icon: "ok",
      kicker: "Updates",
      title: me ? `Waiting on the first visit for ${me.name}` : "No visit yet",
      body: "Your Care Giver will record vitals at the next home visit. Use SOS if you need help now.",
      primary: "View history",
      primaryRoute: "/visits",
    });
  }

  items.push(
    next
      ? {
          icon: "calendar",
          kicker: "Next visit",
          title: `${formatVisitTime(next.scheduled_for)} · ${visitTypeLabel(next.visit_type)}`,
          body: `${next.worker_name} is scheduled to visit${me ? ` ${me.name}` : ""}.`,
          primary: "View visits",
          primaryRoute: "/visits",
        }
      : {
          icon: "calendar",
          kicker: "Next visit",
          title: "No visit booked yet",
          body: "The centre will schedule the next home visit or welfare call.",
          primary: "View visits",
          primaryRoute: "/visits",
        },
  );

  return items;
}

function familyFeed(summary: HomeSummaryResponse): HomeFeedItem[] {
  const items: HomeFeedItem[] = [];
  const sos = summary.open_sos ?? [];
  const next = (summary.schedules ?? [])[0];
  const latest = summary.logs[0];
  const linked = summary.customers;

  if (sos.length) {
    items.push({
      icon: "alert",
      kicker: "Emergency",
      title: `${sos[0].customer_name ?? "Care Focus"} · ${sos[0].status}`,
      body: sos
        .map((incident) => `${incident.customer_name ?? "SOS"} · ${incident.severity} · ${incident.status}`)
        .join("\n"),
      primary: "View history",
      primaryRoute: "/visits",
    });
  }

  if (latest) {
    items.push(
      lastVisitItem(latest, {
        primary: "Health records",
        primaryRoute: `/visits/${latest.log.log_id}`,
      }),
    );
  } else {
    items.push({
      icon: "ok",
      kicker: "Status",
      title: linked.length ? `No visit logged yet for ${linked[0].name}` : "No linked Care Focus",
      body: linked.length
        ? "You will see the latest vitals here after the next home visit."
        : EMPTY_CARE_FOCUS,
      primary: "View history",
      primaryRoute: "/visits",
    });
  }

  items.push(
    next
      ? {
          icon: "calendar",
          kicker: "Next visit",
          title: `${formatVisitTime(next.scheduled_for)} · ${next.customer_name}`,
          body: `${next.worker_name} · ${visitTypeLabel(next.visit_type)} · ${next.customer_address}`,
          primary: "View visits",
          primaryRoute: "/visits",
        }
      : {
          icon: "calendar",
          kicker: "Next visit",
          title: "No visit booked",
          body: linked.length
            ? `The centre has not booked the next visit for ${linked.map((item) => item.name).join(", ")}.`
            : EMPTY_CARE_FOCUS,
          primary: "View visits",
          primaryRoute: "/visits",
        },
  );

  return items;
}
