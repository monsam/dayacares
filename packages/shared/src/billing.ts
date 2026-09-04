export const GST_RATE = 18;
export const CENTRE_TIMEZONE = "Asia/Kolkata";

export function monthlyFeeForPlan(plan?: string | null): number {
  const key = (plan ?? "").toLowerCase();
  if (key.includes("comprehensive")) return 7999;
  if (key.includes("essential")) return 2999;
  return 4999;
}

export function weeklyVisitTarget(plan?: string | null): number {
  return (plan ?? "").toLowerCase().includes("comprehensive") ? 2 : 1;
}

export function gstSplit(amountInr: number, rate = GST_RATE) {
  const gst_inr = Math.round((amountInr * rate) / (100 + rate));
  return { gst_rate: rate, gst_inr, taxable_inr: amountInr - gst_inr };
}

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function currentPeriodLabel(value = new Date()) {
  return value.toLocaleString("en-IN", { month: "short", year: "numeric" });
}
