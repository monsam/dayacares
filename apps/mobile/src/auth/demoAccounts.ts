import type { SessionUser } from "@daya/shared";

export const DEMO_PASSWORD = "Daya@2026";

export const DEMO_ACCOUNTS = [
  { username: "caregiver", role: "WORKER" as const, name: "Priya Sen" },
  { username: "family", role: "FAMILY" as const, name: "Arjun Banerjee" },
  { username: "customer", role: "CUSTOMER" as const, name: "Anjali Banerjee" },
  { username: "admin", role: "ADMIN" as const, name: "Centre Manager" },
] as const;

export type DemoAccount = SessionUser;
