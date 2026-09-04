import type { RowDataPacket } from "mysql2/promise";
import { pool } from "./mysql";

async function hasColumn(table: string, column: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { table, column },
  );
  return Boolean(rows.length);
}

async function hasIndex(table: string, name: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND INDEX_NAME = :name
     LIMIT 1`,
    { table, name },
  );
  return Boolean(rows.length);
}

async function addColumn(sql: string, table: string, column: string) {
  if (await hasColumn(table, column)) return;
  await pool.query(sql);
}

export async function ensureOpsHardening(): Promise<void> {
  await addColumn(
    "ALTER TABLE users ADD COLUMN account_status ENUM('ACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE'",
    "users",
    "account_status",
  );
  await addColumn(
    "ALTER TABLE users ADD COLUMN max_daily_visits INT NOT NULL DEFAULT 8",
    "users",
    "max_daily_visits",
  );
  await addColumn(
    "ALTER TABLE worker_allocations ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 0",
    "worker_allocations",
    "is_primary",
  );
  await addColumn(
    "ALTER TABLE membership_invoices ADD COLUMN gst_rate INT NOT NULL DEFAULT 18",
    "membership_invoices",
    "gst_rate",
  );
  await addColumn(
    "ALTER TABLE membership_invoices ADD COLUMN gst_inr INT NOT NULL DEFAULT 0",
    "membership_invoices",
    "gst_inr",
  );
  await addColumn(
    "ALTER TABLE membership_invoices ADD COLUMN taxable_inr INT NOT NULL DEFAULT 0",
    "membership_invoices",
    "taxable_inr",
  );
  await addColumn(
    "ALTER TABLE sos_incidents ADD COLUMN family_called_at DATETIME(3) NULL",
    "sos_incidents",
    "family_called_at",
  );

  if (!(await hasColumn("users", "phone_digits"))) {
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN phone_digits VARCHAR(10)
        GENERATED ALWAYS AS (RIGHT(REGEXP_REPLACE(IFNULL(phone_number, ''), '[^0-9]', ''), 10)) STORED
    `);
  }
  if (!(await hasIndex("users", "uq_users_phone_digits"))) {
    try {
      await pool.query("ALTER TABLE users ADD UNIQUE KEY uq_users_phone_digits (phone_digits)");
    } catch (error) {
      console.warn("Could not add unique mobile index. Resolve duplicate last-10 digits first.", error);
    }
  }

  await pool.query(`
    UPDATE membership_invoices
       SET taxable_inr = amount_inr - ROUND(amount_inr * gst_rate / (100 + gst_rate)),
           gst_inr = ROUND(amount_inr * gst_rate / (100 + gst_rate))
     WHERE taxable_inr = 0 AND amount_inr > 0
  `);

  await pool.query(`
    UPDATE worker_allocations a
       JOIN (
         SELECT customer_id, MIN(allocation_id) AS allocation_id
         FROM worker_allocations
         GROUP BY customer_id
       ) pick ON pick.allocation_id = a.allocation_id
       LEFT JOIN (
         SELECT customer_id FROM worker_allocations WHERE is_primary = 1 GROUP BY customer_id
       ) already ON already.customer_id = a.customer_id
       SET a.is_primary = 1
     WHERE already.customer_id IS NULL
  `);

  try {
    await pool.query("ALTER TABLE user_notifications MODIFY kind ENUM('SOS', 'VISIT_ALERT', 'DUNNING') NOT NULL");
  } catch {
    // table may not exist yet; notifications ensure runs first
  }
}
