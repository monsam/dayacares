import type { RowDataPacket } from "mysql2/promise";
import type {
  DunningResponse,
  GeneratePlanWeekResponse,
  OpsPlanSla,
  OpsReportResponse,
  VisitSchedule,
} from "@daya/shared";
import { CENTRE_TIMEZONE, weeklyVisitTarget } from "@daya/shared";
import { createSchedule, getBillingBoard, listCustomersForUser, listOpenSosForUser } from "./db";
import { HttpError } from "./http";
import { pool } from "./mysql";
import { insertDunningNotifications } from "./notifications";
import { addDays, centreDateStamp, centreNowWallClock, weekBounds } from "./timezone";

export async function generatePlanWeek(date = centreDateStamp()): Promise<GeneratePlanWeekResponse> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(400, "date must be YYYY-MM-DD.");
  }
  const { from, to } = weekBounds(date);
  const customers = await listCustomersForUser({
    user_id: "user-admin",
    cognito_sub: "demo:admin",
    full_name: "Centre",
    email: "",
    phone_number: "",
    role: "ADMIN",
    account_status: "ACTIVE",
    max_daily_visits: 8,
    device_tokens: [],
    created_at: new Date().toISOString(),
  });
  const created: VisitSchedule[] = [];
  const skipped: GeneratePlanWeekResponse["skipped"] = [];

  for (const customer of customers) {
    if (customer.subscription_status !== "ACTIVE") {
      skipped.push({ customer_id: customer.customer_id, name: customer.name, reason: "Membership is not active." });
      continue;
    }
    const [primary] = await pool.query<(RowDataPacket & { worker_id: string })[]>(
      `SELECT worker_id FROM worker_allocations
       WHERE customer_id = :customerId
       ORDER BY is_primary DESC, allocated_at
       LIMIT 1`,
      { customerId: customer.customer_id },
    );
    if (!primary[0]) {
      skipped.push({ customer_id: customer.customer_id, name: customer.name, reason: "No Care Giver assigned." });
      continue;
    }
    const target = weeklyVisitTarget(customer.plan);
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS n FROM visit_schedules
       WHERE customer_id = :customerId
         AND status IN ('SCHEDULED', 'COMPLETED')
         AND scheduled_for BETWEEN :start AND :end`,
      { customerId: customer.customer_id, start: `${from} 00:00:00.000`, end: `${to} 23:59:59.999` },
    );
    const have = Number(existing[0]?.n ?? 0);
    const need = Math.max(0, target - have);
    if (!need) {
      skipped.push({
        customer_id: customer.customer_id,
        name: customer.name,
        reason: `Already has ${have} visit${have === 1 ? "" : "s"} this week.`,
      });
      continue;
    }

    let booked = 0;
    for (let dayOffset = 0; dayOffset < 5 && booked < need; dayOffset += 1) {
      const day = addDays(from, dayOffset);
      for (const hour of ["10:00", "11:30", "15:00", "16:30"]) {
        if (booked >= need) break;
        try {
          created.push(
            await createSchedule({
              customer_id: customer.customer_id,
              worker_id: primary[0].worker_id,
              scheduled_for: `${day}T${hour}:00`,
              duration_minutes: 45,
              visit_type: "HOME_VISIT",
              notes: `Plan auto-book · ${customer.plan ?? "membership"}`,
            }),
          );
          booked += 1;
        } catch {
          // overlap or capacity — try the next slot
        }
      }
    }
    if (!booked) {
      skipped.push({
        customer_id: customer.customer_id,
        name: customer.name,
        reason: "No free slot this week (overlap or capacity).",
      });
    }
  }

  return { date_from: from, date_to: to, created, skipped };
}

export async function getOpsReport(from?: string, to?: string): Promise<OpsReportResponse> {
  const dateTo = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : centreDateStamp();
  const dateFrom = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : addDays(dateTo, -6);
  const now = centreNowWallClock();
  const [missedRows] = await pool.query<
    (RowDataPacket & {
      schedule_id: string;
      scheduled_for: Date | string;
      customer_name: string;
      worker_name: string;
      visit_type: VisitSchedule["visit_type"];
      plan: string | null;
    })[]
  >(
    `SELECT s.schedule_id, s.scheduled_for, u.full_name AS customer_name, w.full_name AS worker_name,
            s.visit_type, c.plan
     FROM visit_schedules s
     JOIN customer_profiles c ON c.customer_id = s.customer_id
     JOIN users u ON u.user_id = c.user_id
     JOIN users w ON w.user_id = s.worker_id
     WHERE s.status = 'SCHEDULED'
       AND DATE_ADD(s.scheduled_for, INTERVAL s.duration_minutes MINUTE) < :now
       AND s.scheduled_for BETWEEN :start AND :end
     ORDER BY s.scheduled_for`,
    { now, start: `${dateFrom} 00:00:00.000`, end: `${dateTo} 23:59:59.999` },
  );

  const customers = await listCustomersForUser({
    user_id: "user-admin",
    cognito_sub: "demo:admin",
    full_name: "Centre",
    email: "",
    phone_number: "",
    role: "ADMIN",
    account_status: "ACTIVE",
    max_daily_visits: 8,
    device_tokens: [],
    created_at: new Date().toISOString(),
  });
  const plan_sla: OpsPlanSla[] = [];
  for (const customer of customers) {
    const [counts] = await pool.query<RowDataPacket[]>(
      `SELECT
         SUM(status = 'COMPLETED') AS completed,
         SUM(status = 'SCHEDULED' AND scheduled_for >= :now) AS scheduled,
         SUM(status = 'SCHEDULED' AND DATE_ADD(scheduled_for, INTERVAL duration_minutes MINUTE) < :now) AS missed
       FROM visit_schedules
       WHERE customer_id = :customerId AND scheduled_for BETWEEN :start AND :end`,
      {
        customerId: customer.customer_id,
        now,
        start: `${dateFrom} 00:00:00.000`,
        end: `${dateTo} 23:59:59.999`,
      },
    );
    plan_sla.push({
      customer_id: customer.customer_id,
      name: customer.name,
      plan: customer.plan,
      target: weeklyVisitTarget(customer.plan),
      completed: Number(counts[0]?.completed ?? 0),
      scheduled: Number(counts[0]?.scheduled ?? 0),
      missed: Number(counts[0]?.missed ?? 0),
    });
  }

  const billing = await getBillingBoard();
  const admin = {
    user_id: "user-admin",
    cognito_sub: "demo:admin",
    full_name: "Centre",
    email: "",
    phone_number: "",
    role: "ADMIN" as const,
    account_status: "ACTIVE" as const,
    max_daily_visits: 8,
    device_tokens: [],
    created_at: new Date().toISOString(),
  };
  const open_sos = (await listOpenSosForUser(admin)).length;

  return {
    timezone: CENTRE_TIMEZONE,
    date_from: dateFrom,
    date_to: dateTo,
    missed_visits: missedRows.map((row) => ({
      schedule_id: row.schedule_id,
      scheduled_for: row.scheduled_for instanceof Date ? row.scheduled_for.toISOString() : String(row.scheduled_for),
      customer_name: row.customer_name,
      worker_name: row.worker_name,
      visit_type: row.visit_type,
      plan: row.plan ?? undefined,
    })),
    plan_sla,
    open_sos,
    due_inr: billing.due_inr,
    due_count: billing.due_count,
  };
}

export function opsReportCsv(report: OpsReportResponse) {
  const lines = [
    `Daya Cares ops pack,${report.date_from} to ${report.date_to},${report.timezone}`,
    `Open SOS,${report.open_sos}`,
    `Invoices due,${report.due_count},${report.due_inr}`,
    "",
    "Missed visits",
    "When,Care Recipient,Care Giver,Type,Plan",
    ...report.missed_visits.map(
      (visit) =>
        `${visit.scheduled_for},${csv(visit.customer_name)},${csv(visit.worker_name)},${visit.visit_type},${csv(visit.plan ?? "")}`,
    ),
    "",
    "Plan SLA",
    "Care Recipient,Plan,Target,Completed,Still scheduled,Missed",
    ...report.plan_sla.map(
      (row) => `${csv(row.name)},${csv(row.plan ?? "")},${row.target},${row.completed},${row.scheduled},${row.missed}`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function csv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function sendDunningReminders(): Promise<DunningResponse> {
  const billing = await getBillingBoard();
  const due = billing.accounts.flatMap((account) =>
    account.invoices
      .filter((invoice) => invoice.status === "DUE")
      .map((invoice) => ({ account, invoice })),
  );
  let notified = 0;
  for (const { account, invoice } of due) {
    notified += await insertDunningNotifications({
      customerId: account.customer_id,
      customerName: account.name,
      amountInr: invoice.amount_inr,
      periodLabel: invoice.period_label,
      invoiceId: invoice.invoice_id,
    });
  }
  return { notified };
}
