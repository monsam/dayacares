import mysql from "mysql2/promise";
import { config } from "../config";

export const pool = mysql.createPool({
  host: config.mysql.host,
  port: config.mysql.port,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  timezone: "Z",
});

export async function pingDatabase(retries = 20): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

export function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY",
  );
}

export class DuplicateKeyError extends Error {
  constructor() {
    super("Duplicate primary key.");
    this.name = "DuplicateKeyError";
  }
}
