import type { ComponentProps } from "react";
import type { SessionUser } from "@daya/shared";
import { ROLE_LABEL } from "../../auth/AuthContext";

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
        { key: "visits", label: "Upcoming visits", icon: "calendar", route: "/visits" },
        { key: "health", label: "My health", icon: "heart", route: "/visits" },
        { key: "calls", label: "Welfare calls", icon: "call", route: "/home" },
        { key: "messages", label: "Messages", icon: "mail", route: "/home" },
        { key: "billing", label: "My plan", icon: "card", route: "/home" },
      ],
      sidebarTitle: "My care team",
      sidebarLink: "See emergency contacts →",
      sidebarRoute: "/visits",
    };
  }

  if (account.role === "FAMILY") {
    return {
      greeting: `Welcome, ${firstName}`,
      subtitle: ROLE_LABEL.FAMILY,
      avatar,
      actions: [
        { key: "health", label: "Mum's health", icon: "heart", route: "/visits" },
        { key: "visits", label: "Visit history", icon: "calendar", route: "/visits" },
        { key: "alerts", label: "Alerts", icon: "notifications", route: "/home" },
        { key: "messages", label: "Messages", icon: "mail", route: "/home" },
        { key: "sos", label: "Emergency SOS", icon: "alert-circle", route: "sos" },
        { key: "billing", label: "Membership", icon: "card", route: "/home" },
      ],
      sidebarTitle: "Linked Care Focus",
      sidebarLink: "Manage family access →",
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
      { key: "welfare", label: "Welfare calls", icon: "call", route: "/worker/schedule" },
      { key: "messages", label: "Messages", icon: "mail", route: "/worker" },
      { key: "billing", label: "Membership", icon: "card", route: "/worker" },
    ],
    sidebarTitle: "Care team",
    sidebarLink: "See care team details and manage →",
    sidebarRoute: "/worker/clients",
  };
}
