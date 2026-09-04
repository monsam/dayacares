import type { VisitType } from "@daya/shared";
import { CENTRE_TIMEZONE } from "@daya/shared";

export { CENTRE_TIMEZONE };

export function localDateStamp(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CENTRE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function visitTypeLabel(visitType: VisitType) {
  if (visitType === "WELFARE_CALL") return "Welfare call";
  if (visitType === "FOLLOW_UP") return "Follow-up";
  return "Home visit";
}

export function formatVisitTime(iso: string) {
  const match = iso.match(/T(\d{2}):(\d{2})/) ?? iso.match(/ (\d{2}):(\d{2})/);
  if (match) {
    const hour = Number(match[1]);
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${match[2]} ${suffix}`;
  }
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return iso;
  return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

export const LOADING_COPY = "Loading…";
export const LOAD_FAILED = "Could not load this page. Try again in a moment.";
export const EMPTY_CARE_FOCUS = "No Care Focus is linked to this account yet.";

export function apiErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "response" in err) {
    return String((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? fallback);
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
