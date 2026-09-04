import type { RowDataPacket } from "mysql2/promise";
import type {
  AppNotification,
  HealthVisitLog,
  ListNotificationsResponse,
  NotificationKind,
  SosIncident,
} from "@daya/shared";
import { buildFamilyVisitMessage, deriveVisitAlert } from "@daya/shared";
import {
  getCustomer,
  getFamilyMappings,
  getUserById,
  listAllSosIncidents,
  listRecentVisitLogs,
} from "./db";
import { HttpError } from "./http";
import { pool } from "./mysql";

interface NotificationRow extends RowDataPacket {
  notification_id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  related_type: "SOS" | "VISIT" | "INVOICE" | null;
  related_id: string | null;
  customer_id: string | null;
  read_at: Date | string | null;
  created_at: Date | string;
}

function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mysqlDate(value: string): string {
  return new Date(value).toISOString().slice(0, 23).replace("T", " ");
}

function hrefFor(relatedType?: "SOS" | "VISIT" | "INVOICE" | null, relatedId?: string | null): string | undefined {
  if (relatedType === "VISIT" && relatedId) return `/visits/${relatedId}`;
  if (relatedType === "SOS") return "/admin/emergencies";
  if (relatedType === "INVOICE") return "/admin/billing";
  return undefined;
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    notification_id: row.notification_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    related_type: row.related_type ?? undefined,
    related_id: row.related_id ?? undefined,
    customer_id: row.customer_id ?? undefined,
    href: hrefFor(row.related_type, row.related_id),
    read_at: iso(row.read_at),
    created_at: iso(row.created_at) ?? new Date().toISOString(),
  };
}

function notificationId(kind: NotificationKind, relatedId: string, userId: string) {
  return `n-${kind}-${relatedId}-${userId}`.slice(0, 128);
}

export async function ensureNotificationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      notification_id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      kind ENUM('SOS', 'VISIT_ALERT', 'DUNNING') NOT NULL,
      title VARCHAR(160) NOT NULL,
      body VARCHAR(500) NOT NULL,
      related_type VARCHAR(32) NULL,
      related_id VARCHAR(64) NULL,
      customer_id VARCHAR(64) NULL,
      read_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
      CONSTRAINT fk_notif_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles (customer_id) ON DELETE SET NULL,
      INDEX idx_notif_user_time (user_id, created_at),
      INDEX idx_notif_user_unread (user_id, read_at)
    )
  `);
}

async function recipientIdsForCustomer(customerId?: string, extra: Array<string | undefined> = []): Promise<string[]> {
  const ids = new Set(extra.filter((id): id is string => Boolean(id)));
  const [admins] = await pool.query<RowDataPacket[]>("SELECT user_id FROM users WHERE role = 'ADMIN'");
  for (const row of admins) ids.add(String(row.user_id));
  if (!customerId) return [...ids];

  const customer = await getCustomer(customerId);
  ids.add(customer.user_id);
  const family = await getFamilyMappings(customerId);
  for (const mapping of family) ids.add(mapping.family_user_id);
  const [workers] = await pool.query<RowDataPacket[]>(
    "SELECT worker_id FROM worker_allocations WHERE customer_id = :customerId",
    { customerId },
  );
  for (const row of workers) ids.add(String(row.worker_id));
  return [...ids];
}

async function insertNotification(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  relatedType?: "SOS" | "VISIT" | "INVOICE";
  relatedId?: string;
  customerId?: string;
  createdAt?: string;
}): Promise<void> {
  const relatedId = input.relatedId ?? input.kind;
  await pool.query(
    `INSERT IGNORE INTO user_notifications (
       notification_id, user_id, kind, title, body, related_type, related_id, customer_id, created_at
     ) VALUES (
       :notification_id, :user_id, :kind, :title, :body, :related_type, :related_id, :customer_id, :created_at
     )`,
    {
      notification_id: notificationId(input.kind, relatedId, input.userId),
      user_id: input.userId,
      kind: input.kind,
      title: input.title.slice(0, 160),
      body: input.body.slice(0, 500),
      related_type: input.relatedType ?? null,
      related_id: input.relatedId ?? null,
      customer_id: input.customerId ?? null,
      created_at: mysqlDate(input.createdAt ?? new Date().toISOString()),
    },
  );
}

export async function notifySosCreated(incident: SosIncident): Promise<void> {
  const recipients = await recipientIdsForCustomer(incident.customer_id, [
    incident.assigned_worker_id,
    incident.raised_by,
  ]);
  const who = incident.customer_name ?? "a Care Recipient";
  const title = incident.severity === "SOS" ? "Emergency SOS" : `${incident.severity} alert`;
  const body = [incident.raised_by_name, `raised ${incident.severity} for ${who}.`, incident.notes]
    .filter(Boolean)
    .join(" ");

  await Promise.all(
    recipients.map((userId) =>
      insertNotification({
        userId,
        kind: "SOS",
        title,
        body,
        relatedType: "SOS",
        relatedId: incident.incident_id,
        customerId: incident.customer_id,
        createdAt: incident.created_at,
      }),
    ),
  );
}

export async function notifyVisitAlert(input: {
  log: HealthVisitLog;
  workerName: string;
}): Promise<void> {
  const derived = deriveVisitAlert(input.log.vitals_payload, input.log.qualitative_observations);
  if (derived.severity === "INFO") return;

  const customer = await getCustomer(input.log.customer_id);
  const customerUser = await getUserById(customer.user_id);
  const customerName = customerUser?.full_name ?? "Care Recipient";
  const title = derived.severity === "CRITICAL" ? "Urgent visit alert" : "Visit needs attention";
  const body = buildFamilyVisitMessage({
    customerName,
    workerName: input.workerName,
    vitals: input.log.vitals_payload,
    severity: derived.severity,
  });

  const recipients = (await recipientIdsForCustomer(input.log.customer_id)).filter(
    (userId) => userId !== input.log.worker_id,
  );

  await Promise.all(
    recipients.map((userId) =>
      insertNotification({
        userId,
        kind: "VISIT_ALERT",
        title,
        body,
        relatedType: "VISIT",
        relatedId: input.log.log_id,
        customerId: input.log.customer_id,
        createdAt: input.log.visit_timestamp,
      }),
    ),
  );
}

export async function insertDunningNotifications(input: {
  customerId: string;
  customerName: string;
  amountInr: number;
  periodLabel: string;
  invoiceId: string;
}): Promise<number> {
  const recipients = await recipientIdsForCustomer(input.customerId);
  const title = `Fee due · ${input.periodLabel}`;
  const body = `${input.customerName} has ₹${input.amountInr.toLocaleString("en-IN")} due for ${input.periodLabel}. Pay at the centre or mark paid on Billing.`;
  await Promise.all(
    recipients.map((userId) =>
      insertNotification({
        userId,
        kind: "DUNNING",
        title,
        body,
        relatedType: "INVOICE",
        relatedId: input.invoiceId,
        customerId: input.customerId,
      }),
    ),
  );
  return recipients.length;
}

export async function backfillNotifications(): Promise<number> {
  const [countRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM user_notifications");
  if (Number(countRows[0]?.n ?? 0) > 0) return 0;

  const incidents = await listAllSosIncidents();
  for (const incident of incidents) {
    await notifySosCreated(incident);
  }

  const logs = await listRecentVisitLogs(80);
  for (const log of logs) {
    const worker = await getUserById(log.worker_id);
    await notifyVisitAlert({ log, workerName: worker?.full_name ?? "Care Giver" });
  }

  const [after] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM user_notifications");
  return Number(after[0]?.n ?? 0);
}

export async function listNotificationsForUser(userId: string): Promise<ListNotificationsResponse> {
  const [rows] = await pool.query<NotificationRow[]>(
    `SELECT *
     FROM user_notifications
     WHERE user_id = :userId
     ORDER BY (read_at IS NULL) DESC, created_at DESC
     LIMIT 80`,
    { userId },
  );
  const notifications = rows.map(mapNotification);
  return {
    notifications,
    unread_count: notifications.filter((item) => !item.read_at).length,
  };
}

export async function getNotificationForUser(userId: string, notificationId: string): Promise<AppNotification> {
  const [rows] = await pool.query<NotificationRow[]>(
    `SELECT * FROM user_notifications WHERE notification_id = :notificationId AND user_id = :userId LIMIT 1`,
    { notificationId, userId },
  );
  if (!rows[0]) {
    throw new HttpError(404, "Notification was not found.");
  }
  return mapNotification(rows[0]);
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<AppNotification> {
  const existing = await getNotificationForUser(userId, notificationId);
  if (!existing.read_at) {
    await pool.query(
      `UPDATE user_notifications
       SET read_at = :read_at
       WHERE notification_id = :notificationId AND user_id = :userId`,
      {
        read_at: mysqlDate(new Date().toISOString()),
        notificationId,
        userId,
      },
    );
  }
  return getNotificationForUser(userId, notificationId);
}