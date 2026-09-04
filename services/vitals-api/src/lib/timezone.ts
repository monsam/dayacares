import { CENTRE_TIMEZONE } from "@daya/shared";

export { CENTRE_TIMEZONE };

function part(value: Date, type: Intl.DateTimeFormatPartTypes) {
  const found = new Intl.DateTimeFormat("en-GB", {
    timeZone: CENTRE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(value)
    .find((item) => item.type === type);
  return found?.value ?? "";
}

export function centreDateStamp(value = new Date()) {
  return `${part(value, "year")}-${part(value, "month")}-${part(value, "day")}`;
}

export function centreNowWallClock(value = new Date()) {
  return `${centreDateStamp(value)} ${part(value, "hour")}:${part(value, "minute")}:${part(value, "second")}.000`;
}

export function mondayOf(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const weekday = new Date(utc).getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(utc + offset * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function weekBounds(date: string) {
  const from = mondayOf(date);
  return { from, to: addDays(from, 6) };
}
