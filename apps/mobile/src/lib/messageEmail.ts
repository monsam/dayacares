import { Linking } from "react-native";
import type { CareTeamPerson } from "@daya/shared";

export function caregiverEmails(team: CareTeamPerson[] | undefined) {
  if (!team?.length) return "";
  return team
    .filter((person) => person.role === "WORKER" || person.role_label === "Care Giver")
    .map((person) => person.email?.trim() ?? "")
    .filter((email) => email.includes("@"))
    .join(", ");
}

export function mailtoHref(to: string, subject: string, body: string) {
  const parts: string[] = [];
  if (subject.trim()) parts.push(`subject=${encodeURIComponent(subject.trim())}`);
  if (body.trim()) parts.push(`body=${encodeURIComponent(body.trim())}`);
  return `mailto:${to.trim()}${parts.length ? `?${parts.join("&")}` : ""}`;
}

export async function openCaregiverMailto(to: string, subject: string, body: string) {
  await Linking.openURL(mailtoHref(to, subject, body));
}
