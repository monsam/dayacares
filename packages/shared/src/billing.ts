export function monthlyFeeForPlan(plan?: string | null): number {
  const key = (plan ?? "").toLowerCase();
  if (key.includes("comprehensive")) return 7999;
  if (key.includes("essential")) return 2999;
  return 4999;
}

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function currentPeriodLabel(value = new Date()) {
  return value.toLocaleString("en-IN", { month: "short", year: "numeric" });
}
