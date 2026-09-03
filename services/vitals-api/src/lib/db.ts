import type { RowDataPacket } from "mysql2/promise";
import type {
  CareRecipientRegistration,
  CareTeamPerson,
  BillingBoardResponse,
  CreateCareRecipientResponse,
  CreateDirectoryUserRequest,
  CreateDirectoryUserResponse,
  CreateInvoiceRequest,
  CreateScheduleRequest,
  CreateSosRequest,
  CustomerProfile,
  CustomerSummary,
  DeviceToken,
  EmergencyContact,
  FamilyMapping,
  InvoiceStatus,
  LoginResponse,
  HealthVisitLog,
  HomeVisitSummary,
  MedicalHistory,
  QualitativeObservations,
  MembershipInvoice,
  RoutedMember,
  RoutingBoardResponse,
  SosIncident,
  SosSeverity,
  SosStatus,
  SubscriptionStatus,
  UpdateDirectoryUserRequest,
  UpdateInvoiceRequest,
  UpdateScheduleRequest,
  UpdateSosRequest,
  User,
  UserRole,
  VisitSchedule,
  VisitScheduleStatus,
  VisitType,
  VitalsPayload,
  WorkerSummary,
  DirectoryUser,
} from "@daya/shared";
import { USER_ROLES, monthlyFeeForPlan, currentPeriodLabel } from "@daya/shared";
import { randomUUID } from "node:crypto";
import { DuplicateKeyError, isDuplicateKeyError, pool } from "./mysql";
import { HttpError } from "./http";
import { defaultLoginPassword, hashPassword, verifyPassword } from "./password";

interface UserRow extends RowDataPacket {
  user_id: string;
  username: string;
  cognito_sub: string;
  full_name: string;
  email: string;
  phone_number: string;
  password_hash?: string | null;
  role: UserRole;
  device_tokens: DeviceToken[] | string;
  created_at: Date | string;
}

interface CustomerRow extends RowDataPacket {
  customer_id: string;
  user_id: string;
  address_durgapur: string;
  plan: string | null;
  emergency_contacts: EmergencyContact[] | string;
  medical_history: MedicalHistory | string | null;
  subscription_status: SubscriptionStatus;
}

interface CustomerSummaryRow extends RowDataPacket {
  customer_id: string;
  user_id: string;
  name: string;
  address: string;
  plan: string | null;
  subscription_status: SubscriptionStatus;
}

interface FamilyRow extends RowDataPacket {
  mapping_id: string;
  family_user_id: string;
  customer_id: string;
  relationship: string;
  access_granted_at: Date | string;
}

interface VisitRow extends RowDataPacket {
  log_id: string;
  customer_id: string;
  worker_id: string;
  visit_timestamp: Date | string;
  entry_source: HealthVisitLog["entry_source"];
  vitals_payload: VitalsPayload | string;
  qualitative_observations: QualitativeObservations | string;
  visit_photo_s3_url: string | null;
  created_at: Date | string;
}

function parseJson<T>(value: T | string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mysqlDate(value: string): string {
  return new Date(value).toISOString().slice(0, 23).replace("T", " ");
}

function mysqlWallClock(value: string): string {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/);
  if (match) {
    return `${match[1]} ${match[2]}:${match[3] ?? "00"}.000`;
  }
  return mysqlDate(value);
}

function mapUser(row: UserRow): User {
  return {
    user_id: row.user_id,
    username: row.username,
    cognito_sub: row.cognito_sub,
    full_name: row.full_name,
    email: row.email,
    phone_number: row.phone_number,
    role: row.role,
    device_tokens: parseJson(row.device_tokens, []),
    created_at: iso(row.created_at),
  };
}

function mapCustomer(row: CustomerRow): CustomerProfile {
  return {
    customer_id: row.customer_id,
    user_id: row.user_id,
    address_durgapur: row.address_durgapur,
    emergency_contacts: parseJson(row.emergency_contacts, []),
    medical_history: parseJson(row.medical_history, {}),
    subscription_status: row.subscription_status,
  };
}

function mapCustomerSummary(row: CustomerSummaryRow): CustomerSummary {
  return {
    customer_id: row.customer_id,
    user_id: row.user_id,
    name: row.name,
    address: row.address,
    plan: row.plan ?? undefined,
    subscription_status: row.subscription_status,
  };
}

function mapVisit(row: VisitRow): HealthVisitLog {
  return {
    log_id: row.log_id,
    customer_id: row.customer_id,
    worker_id: row.worker_id,
    visit_timestamp: iso(row.visit_timestamp),
    entry_source: row.entry_source,
    vitals_payload: parseJson(row.vitals_payload, {}),
    qualitative_observations: parseJson(row.qualitative_observations, {}),
    visit_photo_s3_url: row.visit_photo_s3_url ?? undefined,
    created_at: iso(row.created_at),
  };
}

export async function getUserByCognitoSub(cognitoSub: string): Promise<User | undefined> {
  const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE cognito_sub = :sub LIMIT 1", {
    sub: cognitoSub,
  });
  return rows[0] ? mapUser(rows[0]) : undefined;
}

export async function getUserByUsername(username: string): Promise<(User & { password_hash?: string }) | undefined> {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT * FROM users WHERE LOWER(username) = LOWER(:username) LIMIT 1",
    { username: username.trim() },
  );
  if (!rows[0]) return undefined;
  return { ...mapUser(rows[0]), password_hash: rows[0].password_hash ?? undefined };
}

export async function ensurePasswordColumn() {
  const [cols] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'`,
  );
  if (!cols.length) {
    await pool.query("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER phone_number");
  }
}

export async function backfillDefaultPasswords() {
  await ensurePasswordColumn();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM users WHERE password_hash IS NULL OR password_hash = ''",
  );
  const missing = Number(rows[0]?.n ?? 0);
  if (!missing) return 0;
  const hash = await hashPassword(defaultLoginPassword());
  await pool.query(
    "UPDATE users SET password_hash = :hash WHERE password_hash IS NULL OR password_hash = ''",
    { hash },
  );
  return missing;
}

export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  const user = await getUserByUsername(username);
  if (!user) {
    throw new HttpError(401, "Username or password is incorrect.");
  }
  const hash = user.password_hash;
  if (hash) {
    const ok = await verifyPassword(password, hash);
    if (!ok) {
      throw new HttpError(401, "Username or password is incorrect.");
    }
  } else if (password !== defaultLoginPassword()) {
    throw new HttpError(401, "Username or password is incorrect.");
  } else {
    await pool.query("UPDATE users SET password_hash = :hash WHERE user_id = :userId", {
      hash: await hashPassword(password),
      userId: user.user_id,
    });
  }
  return {
    token: user.cognito_sub.startsWith("demo:") ? user.cognito_sub : `demo:${user.username ?? username.trim()}`,
    user: {
      user_id: user.user_id,
      username: user.username ?? username.trim(),
      role: user.role,
      name: user.full_name,
    },
  };
}

export async function getUserById(userId: string): Promise<User | undefined> {
  const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE user_id = :userId LIMIT 1", {
    userId,
  });
  return rows[0] ? mapUser(rows[0]) : undefined;
}

export async function getCustomer(customerId: string): Promise<CustomerProfile> {
  const [rows] = await pool.query<CustomerRow[]>(
    "SELECT * FROM customer_profiles WHERE customer_id = :customerId LIMIT 1",
    { customerId },
  );
  if (!rows[0]) {
    throw new HttpError(404, "Customer profile not found.");
  }
  return mapCustomer(rows[0]);
}

export async function getCustomerSummary(customerId: string): Promise<CustomerSummary> {
  const [rows] = await pool.query<CustomerSummaryRow[]>(
    `SELECT
       c.customer_id,
       c.user_id,
       u.full_name AS name,
       c.address_durgapur AS address,
       c.plan,
       c.subscription_status
     FROM customer_profiles c
     JOIN users u ON u.user_id = c.user_id
     WHERE c.customer_id = :customerId
     LIMIT 1`,
    { customerId },
  );
  if (!rows[0]) {
    throw new HttpError(404, "Customer profile not found.");
  }
  return mapCustomerSummary(rows[0]);
}

export async function listCustomersForUser(user: User): Promise<CustomerSummary[]> {
  let sql = `SELECT
       c.customer_id,
       c.user_id,
       u.full_name AS name,
       c.address_durgapur AS address,
       c.plan,
       c.subscription_status
     FROM customer_profiles c
     JOIN users u ON u.user_id = c.user_id`;
  const params: Record<string, string> = {};

  if (user.role === "WORKER") {
    sql += ` JOIN worker_allocations a ON a.customer_id = c.customer_id
             WHERE a.worker_id = :userId`;
    params.userId = user.user_id;
  } else if (user.role === "FAMILY") {
    sql += ` JOIN family_mappings m ON m.customer_id = c.customer_id
             WHERE m.family_user_id = :userId`;
    params.userId = user.user_id;
  } else if (user.role === "CUSTOMER") {
    sql += " WHERE c.user_id = :userId";
    params.userId = user.user_id;
  }

  sql += " ORDER BY u.full_name";
  const [rows] = await pool.query<CustomerSummaryRow[]>(sql, params);
  return rows.map(mapCustomerSummary);
}

export async function assertWorkerAssigned(workerId: string, customerId: string): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 AS ok
     FROM worker_allocations
     WHERE worker_id = :workerId AND customer_id = :customerId
     LIMIT 1`,
    { workerId, customerId },
  );
  if (!rows.length) {
    throw new HttpError(403, "Worker is not assigned to this Care Focus.");
  }
}

export async function assertCanAccessCustomer(user: User, customerId: string): Promise<void> {
  if (user.role === "ADMIN") {
    await getCustomer(customerId);
    return;
  }
  if (user.role === "WORKER") {
    await assertWorkerAssigned(user.user_id, customerId);
    return;
  }
  if (user.role === "CUSTOMER") {
    const customer = await getCustomer(customerId);
    if (customer.user_id !== user.user_id) {
      throw new HttpError(403, "Care Focus can only view their own profile.");
    }
    return;
  }
  const mappings = await getFamilyMappings(customerId);
  if (!mappings.some((mapping) => mapping.family_user_id === user.user_id)) {
    throw new HttpError(403, "Family member is not linked to this Care Focus.");
  }
}

export async function putHealthVisitLog(log: HealthVisitLog): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO health_visit_logs (
         log_id,
         customer_id,
         worker_id,
         visit_timestamp,
         entry_source,
         vitals_payload,
         qualitative_observations,
         visit_photo_s3_url,
         created_at
       ) VALUES (
         :log_id,
         :customer_id,
         :worker_id,
         :visit_timestamp,
         :entry_source,
         CAST(:vitals_payload AS JSON),
         CAST(:qualitative_observations AS JSON),
         :visit_photo_s3_url,
         :created_at
       )`,
      {
        log_id: log.log_id,
        customer_id: log.customer_id,
        worker_id: log.worker_id,
        visit_timestamp: mysqlDate(log.visit_timestamp),
        entry_source: log.entry_source,
        vitals_payload: JSON.stringify(log.vitals_payload),
        qualitative_observations: JSON.stringify(log.qualitative_observations),
        visit_photo_s3_url: log.visit_photo_s3_url ?? null,
        created_at: mysqlDate(log.created_at),
      },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new DuplicateKeyError();
    }
    throw error;
  }
}

export async function listHealthVisitLogs(customerId: string): Promise<HealthVisitLog[]> {
  const [rows] = await pool.query<VisitRow[]>(
    `SELECT *
     FROM health_visit_logs
     WHERE customer_id = :customerId
     ORDER BY visit_timestamp DESC
     LIMIT 50`,
    { customerId },
  );
  return rows.map(mapVisit);
}

export async function getFamilyMappings(customerId: string): Promise<FamilyMapping[]> {
  const [rows] = await pool.query<FamilyRow[]>(
    "SELECT * FROM family_mappings WHERE customer_id = :customerId",
    { customerId },
  );
  return rows.map((row) => ({
    mapping_id: row.mapping_id,
    family_user_id: row.family_user_id,
    customer_id: row.customer_id,
    relationship: row.relationship,
    access_granted_at: iso(row.access_granted_at),
  }));
}

interface VisitSummaryRow extends VisitRow {
  worker_name: string;
  customer_name: string;
  address: string;
}

function inParams(ids: string[], prefix: string) {
  const params: Record<string, string> = {};
  const placeholders = ids.map((id, index) => {
    const key = `${prefix}${index}`;
    params[key] = id;
    return `:${key}`;
  });
  return { params, sql: placeholders.join(", ") };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mapVisitSummary(row: VisitSummaryRow): HomeVisitSummary {
  return {
    log: mapVisit(row),
    customer_name: row.customer_name,
    worker_name: row.worker_name,
    address: row.address,
  };
}

const VISIT_SUMMARY_SELECT = `SELECT
       l.*,
       w.full_name AS worker_name,
       u.full_name AS customer_name,
       c.address_durgapur AS address
     FROM health_visit_logs l
     JOIN customer_profiles c ON c.customer_id = l.customer_id
     JOIN users u ON u.user_id = c.user_id
     JOIN users w ON w.user_id = l.worker_id`;

export async function listVisitSummaries(customerIds: string[], limit = 50): Promise<HomeVisitSummary[]> {
  if (!customerIds.length) return [];
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const { params, sql } = inParams(customerIds, "cid");
  const [rows] = await pool.query<VisitSummaryRow[]>(
    `${VISIT_SUMMARY_SELECT}
     WHERE l.customer_id IN (${sql})
     ORDER BY l.visit_timestamp DESC
     LIMIT ${safeLimit}`,
    params,
  );
  return rows.map(mapVisitSummary);
}

export async function listRecentVisitSummaries(customerIds: string[]): Promise<HomeVisitSummary[]> {
  return listVisitSummaries(customerIds, 8);
}

export interface FormSource {
  customer?: CustomerSummary;
  user?: User;
  landmark?: string;
  date_of_birth?: string;
  gender?: string;
  care_recipient_type?: string;
  emergency_contacts: EmergencyContact[];
  medical_history: MedicalHistory;
  registration?: CareRecipientRegistration;
  family: Array<{ name: string; relationship: string; phone: string; email?: string }>;
  worker_name?: string;
  visit?: HomeVisitSummary;
  visits_today: HomeVisitSummary[];
  sos_open: SosIncident[];
  generated_for: string;
}

export async function getFormSource(
  actor: User,
  options: { customerId?: string; logId?: string },
): Promise<FormSource> {
  let customerId = options.customerId;
  let visit: HomeVisitSummary | undefined;
  if (options.logId) {
    visit = await getVisitSummary(options.logId);
    customerId = visit.log.customer_id;
  }
  if (customerId) {
    await assertCanAccessCustomer(actor, customerId);
  } else if (actor.role !== "ADMIN" && actor.role !== "WORKER") {
    throw new HttpError(400, "Choose a Care Focus to download this form.");
  }

  let customer: CustomerSummary | undefined;
  let user: User | undefined;
  let landmark: string | undefined;
  let date_of_birth: string | undefined;
  let gender: string | undefined;
  let care_recipient_type: string | undefined;
  let emergency_contacts: EmergencyContact[] = [];
  let medical_history: MedicalHistory = {};
  let registration: CareRecipientRegistration | undefined;
  let family: FormSource["family"] = [];
  let worker_name: string | undefined;

  if (customerId) {
    customer = await getCustomerSummary(customerId);
    user = await getUserById(customer.user_id);
    const [rows] = await pool.query<CustomerRow[]>(
      "SELECT * FROM customer_profiles WHERE customer_id = :customerId LIMIT 1",
      { customerId },
    );
    const row = rows[0];
    if (row) {
      landmark = (row as CustomerRow & { landmark?: string | null }).landmark ?? undefined;
      const dob = (row as CustomerRow & { date_of_birth?: Date | string | null }).date_of_birth;
      date_of_birth = dob ? (dob instanceof Date ? dob.toISOString().slice(0, 10) : String(dob).slice(0, 10)) : undefined;
      gender = (row as CustomerRow & { gender?: string | null }).gender ?? undefined;
      care_recipient_type = (row as CustomerRow & { care_recipient_type?: string | null }).care_recipient_type ?? undefined;
      emergency_contacts = parseJson(row.emergency_contacts, []);
      medical_history = parseJson(row.medical_history, {});
      registration = parseJson((row as CustomerRow & { registration_payload?: CareRecipientRegistration | string | null }).registration_payload, undefined);
    }
    const mappings = await getFamilyMappings(customerId);
    for (const mapping of mappings) {
      const familyUser = await getUserById(mapping.family_user_id);
      if (familyUser) {
        family.push({
          name: familyUser.full_name,
          relationship: mapping.relationship,
          phone: familyUser.phone_number,
          email: familyUser.email,
        });
      }
    }
    const [workers] = await pool.query<UserRow[]>(
      `SELECT u.* FROM users u
       JOIN worker_allocations a ON a.worker_id = u.user_id
       WHERE a.customer_id = :customerId
       ORDER BY a.allocated_at DESC
       LIMIT 1`,
      { customerId },
    );
    worker_name = workers[0]?.full_name ?? visit?.worker_name;
  }

  const today = new Date().toISOString().slice(0, 10);
  let visitsToday: HomeVisitSummary[] = [];
  if (actor.role === "WORKER") {
    const [rows] = await pool.query<VisitSummaryRow[]>(
      `${VISIT_SUMMARY_SELECT}
       WHERE l.worker_id = :workerId AND DATE(l.visit_timestamp) = :today
       ORDER BY l.visit_timestamp DESC`,
      { workerId: actor.user_id, today },
    );
    visitsToday = rows.map(mapVisitSummary);
  } else if (customerId) {
    visitsToday = (await listVisitSummaries([customerId], 20)).filter((item) =>
      item.log.visit_timestamp.startsWith(today),
    );
  } else if (actor.role === "ADMIN") {
    const customers = await listCustomersForUser(actor);
    visitsToday = (await listVisitSummaries(
      customers.map((item) => item.customer_id),
      40,
    )).filter((item) => item.log.visit_timestamp.startsWith(today));
  }

  const sos_open = (await listSosForUser(actor)).filter((item) => item.status !== "RESOLVED");

  return {
    customer,
    user,
    landmark,
    date_of_birth,
    gender,
    care_recipient_type,
    emergency_contacts,
    medical_history,
    registration,
    family,
    worker_name,
    visit,
    visits_today: visitsToday,
    sos_open,
    generated_for: actor.full_name,
  };
}

export async function getVisitSummary(logId: string): Promise<HomeVisitSummary> {
  const [rows] = await pool.query<VisitSummaryRow[]>(
    `${VISIT_SUMMARY_SELECT}
     WHERE l.log_id = :logId
     LIMIT 1`,
    { logId },
  );
  if (!rows[0]) {
    throw new HttpError(404, "Visit log not found.");
  }
  return mapVisitSummary(rows[0]);
}

export async function listCareTeam(user: User, customers: CustomerSummary[]): Promise<CareTeamPerson[]> {
  const people = new Map<string, CareTeamPerson>();
  const add = (id: string, name: string, roleLabel: string, email?: string, role?: User["role"]) => {
    if (id === user.user_id || people.has(id)) return;
    people.set(id, {
      user_id: id,
      name,
      role_label: roleLabel,
      initials: initials(name),
      email: email?.trim() || undefined,
      role,
    });
  };

  if (user.role === "ADMIN") {
    const [rows] = await pool.query<UserRow[]>(
      "SELECT * FROM users WHERE role IN ('WORKER', 'ADMIN') ORDER BY full_name",
    );
    for (const row of rows) {
      add(row.user_id, row.full_name, row.role === "ADMIN" ? "Admin" : "Care Giver", row.email, row.role);
    }
    return [...people.values()];
  }

  for (const customer of customers) {
    add(customer.user_id, customer.name, customer.plan ? `${customer.plan} plan` : "Care Focus", undefined, "CUSTOMER");
  }

  const customerIds = customers.map((customer) => customer.customer_id);
  if (!customerIds.length) return [...people.values()];

  const { params, sql } = inParams(customerIds, "tid");
  const [familyRows] = await pool.query<(RowDataPacket & { user_id: string; full_name: string; email: string; relationship: string })[]>(
    `SELECT u.user_id, u.full_name, u.email, m.relationship
     FROM family_mappings m
     JOIN users u ON u.user_id = m.family_user_id
     WHERE m.customer_id IN (${sql})`,
    params,
  );
  for (const row of familyRows) {
    add(row.user_id, row.full_name, `${row.relationship} · Care Family`, row.email, "FAMILY");
  }

  const [workerRows] = await pool.query<(RowDataPacket & { user_id: string; full_name: string; email: string })[]>(
    `SELECT DISTINCT u.user_id, u.full_name, u.email
     FROM worker_allocations a
     JOIN users u ON u.user_id = a.worker_id
     WHERE a.customer_id IN (${sql})`,
    params,
  );
  for (const row of workerRows) {
    add(row.user_id, row.full_name, "Care Giver", row.email, "WORKER");
  }

  return [...people.values()];
}

export async function listWorkers(): Promise<WorkerSummary[]> {
  const [rows] = await pool.query<(RowDataPacket & { user_id: string; full_name: string })[]>(
    "SELECT user_id, full_name FROM users WHERE role = 'WORKER' ORDER BY full_name",
  );
  return rows.map((row) => ({ user_id: row.user_id, name: row.full_name }));
}

interface DirectoryUserRow extends UserRow {
  address?: string | null;
}

function toDirectoryUser(row: DirectoryUserRow): DirectoryUser {
  const user = mapUser(row);
  return {
    user_id: user.user_id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    phone_number: user.phone_number,
    role: user.role,
    created_at: user.created_at,
    address: row.address ?? undefined,
  };
}

export async function listDirectoryUsers(): Promise<DirectoryUser[]> {
  const [rows] = await pool.query<DirectoryUserRow[]>(
    `SELECT u.*, c.address_durgapur AS address
     FROM users u
     LEFT JOIN customer_profiles c ON c.user_id = u.user_id
     ORDER BY u.role, u.full_name`,
  );
  return rows.map(toDirectoryUser);
}

export async function getDirectoryUser(userId: string): Promise<DirectoryUser> {
  const [rows] = await pool.query<DirectoryUserRow[]>(
    `SELECT u.*, c.address_durgapur AS address
     FROM users u
     LEFT JOIN customer_profiles c ON c.user_id = u.user_id
     WHERE u.user_id = :userId
     LIMIT 1`,
    { userId },
  );
  if (!rows[0]) {
    throw new HttpError(404, "User was not found.");
  }
  return toDirectoryUser(rows[0]);
}

async function assertPhoneAvailable(phone: string, ignoreUserId?: string) {
  const existing = await getUserByPhone(phone);
  if (existing && existing.user_id !== ignoreUserId) {
    throw new HttpError(
      409,
      `Mobile ${phone.trim()} is already used by ${existing.full_name} (${existing.username ?? existing.user_id}).`,
    );
  }
}

async function countAdmins() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN'");
  return Number(rows[0]?.n ?? 0);
}

async function getCustomerIdForUser(userId: string): Promise<string | undefined> {
  const [rows] = await pool.query<(RowDataPacket & { customer_id: string })[]>(
    "SELECT customer_id FROM customer_profiles WHERE user_id = :userId LIMIT 1",
    { userId },
  );
  return rows[0]?.customer_id;
}

async function insertCustomerProfile(userId: string, address: string) {
  await pool.query(
    `INSERT INTO customer_profiles (
       customer_id, user_id, address_durgapur, plan, emergency_contacts, subscription_status
     ) VALUES (
       :customer_id, :user_id, :address, 'Enhanced', CAST(:emergency_contacts AS JSON), 'ACTIVE'
     )`,
    {
      customer_id: `cr-${randomUUID().slice(0, 8)}`,
      user_id: userId,
      address: address.trim(),
      emergency_contacts: JSON.stringify([]),
    },
  );
}

function parseRole(role: string): UserRole {
  if (!USER_ROLES.includes(role as UserRole)) {
    throw new HttpError(400, "Role must be Admin, Care Giver, Care Focus, or Care Family.");
  }
  return role as UserRole;
}

async function hashForCreate(plain?: string) {
  const value = plain?.trim() || defaultLoginPassword();
  try {
    return { hash: await hashPassword(value), usedDefault: !plain?.trim() };
  } catch {
    throw new HttpError(400, "Password must be at least 8 characters.");
  }
}

export async function createDirectoryUser(body: CreateDirectoryUserRequest): Promise<CreateDirectoryUserResponse> {
  const fullName = body.full_name.trim();
  const phone = body.phone_number.trim();
  const role = parseRole(body.role);
  if (!fullName) throw new HttpError(400, "Full name is required.");
  if (!phone) throw new HttpError(400, "Mobile number is required.");
  if (role === "CUSTOMER" && !body.address?.trim()) {
    throw new HttpError(400, "Address is required for a Care Focus.");
  }
  await assertPhoneAvailable(phone);
  const userId = `user-${randomUUID()}`;
  const username = await uniqueUsername(`${fullName}${phone.replace(/\D/g, "").slice(-4)}`);
  const email = body.email?.trim() || `${username}@dayacares.local`;
  const now = mysqlDate(new Date().toISOString());
  const secret = await hashForCreate(body.password);
  await pool.query(
    `INSERT INTO users (
       user_id, username, cognito_sub, full_name, email, phone_number, password_hash, role, device_tokens, created_at
     ) VALUES (
       :user_id, :username, :cognito_sub, :full_name, :email, :phone_number, :password_hash, :role, :device_tokens, :created_at
     )`,
    {
      user_id: userId,
      username,
      cognito_sub: `demo:${username}`,
      full_name: fullName,
      email,
      phone_number: phone,
      password_hash: secret.hash,
      role,
      device_tokens: JSON.stringify([]),
      created_at: now,
    },
  );
  if (role === "CUSTOMER") {
    await insertCustomerProfile(userId, body.address ?? "");
  }
  const created = await getDirectoryUser(userId);
  return {
    ...created,
    temporary_password: secret.usedDefault ? defaultLoginPassword() : undefined,
  };
}

export async function updateDirectoryUser(
  userId: string,
  body: UpdateDirectoryUserRequest,
  actorId?: string,
): Promise<DirectoryUser> {
  const existing = await getUserById(userId);
  if (!existing) {
    throw new HttpError(404, "User was not found.");
  }
  const fullName = body.full_name?.trim() || existing.full_name;
  const phone = body.phone_number?.trim() || existing.phone_number;
  const email = body.email?.trim() || existing.email;
  const role = body.role ? parseRole(body.role) : existing.role;
  if (existing.role === "ADMIN" && role !== "ADMIN" && (await countAdmins()) <= 1) {
    throw new HttpError(400, "The last Admin account must stay Admin.");
  }
  if (actorId && userId === actorId && role !== "ADMIN") {
    throw new HttpError(400, "You cannot remove Admin from your own account.");
  }
  if (existing.role === "CUSTOMER" && role !== "CUSTOMER") {
    throw new HttpError(400, "A Care Focus login cannot change role. Delete the member, or keep them as Care Focus.");
  }
  if (role === "CUSTOMER" && existing.role !== "CUSTOMER" && !body.address?.trim()) {
    throw new HttpError(400, "Address is required to make this person a Care Focus.");
  }
  await assertPhoneAvailable(phone, userId);
  const nextHash = body.password?.trim() ? (await hashForCreate(body.password)).hash : undefined;
  await pool.query(
    `UPDATE users SET
       full_name = :full_name,
       email = :email,
       phone_number = :phone_number,
       role = :role
       ${nextHash ? ", password_hash = :password_hash" : ""}
     WHERE user_id = :user_id`,
    {
      user_id: userId,
      full_name: fullName,
      email,
      phone_number: phone,
      role,
      password_hash: nextHash,
    },
  );
  const customerId = await getCustomerIdForUser(userId);
  if (role === "CUSTOMER" && body.address?.trim()) {
    if (customerId) {
      await pool.query(
        "UPDATE customer_profiles SET address_durgapur = :address WHERE user_id = :userId",
        { address: body.address.trim(), userId },
      );
    } else {
      await insertCustomerProfile(userId, body.address);
    }
  }
  return getDirectoryUser(userId);
}

export async function deleteDirectoryUser(userId: string, actorId?: string): Promise<void> {
  const existing = await getUserById(userId);
  if (!existing) {
    throw new HttpError(404, "User was not found.");
  }
  if (actorId && userId === actorId) {
    throw new HttpError(400, "You cannot delete your own account.");
  }
  if (existing.role === "ADMIN" && (await countAdmins()) <= 1) {
    throw new HttpError(400, "The last Admin account cannot be deleted.");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const customerId = await getCustomerIdForUser(userId);
    if (customerId) {
      await connection.query("DELETE FROM membership_invoices WHERE customer_id = :customerId", { customerId });
      await connection.query("DELETE FROM sos_incidents WHERE customer_id = :customerId", { customerId });
      await connection.query("DELETE FROM visit_schedules WHERE customer_id = :customerId", { customerId });
      await connection.query("DELETE FROM health_visit_logs WHERE customer_id = :customerId", { customerId });
      await connection.query("DELETE FROM worker_allocations WHERE customer_id = :customerId", { customerId });
      await connection.query("DELETE FROM family_mappings WHERE customer_id = :customerId", { customerId });
      await connection.query("DELETE FROM customer_profiles WHERE customer_id = :customerId", { customerId });
    }
    await connection.query("DELETE FROM sos_incidents WHERE raised_by = :userId OR assigned_worker_id = :userId", {
      userId,
    });
    await connection.query("DELETE FROM visit_schedules WHERE worker_id = :userId", { userId });
    await connection.query("DELETE FROM worker_allocations WHERE worker_id = :userId", { userId });
    await connection.query("DELETE FROM family_mappings WHERE family_user_id = :userId", { userId });
    await connection.query("DELETE FROM health_visit_logs WHERE worker_id = :userId", { userId });
    await connection.query("DELETE FROM users WHERE user_id = :userId", { userId });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

function last10(phone: string) {
  return digitsOnly(phone).slice(-10);
}

function phonesMatch(left?: string, right?: string) {
  if (!left?.trim() || !right?.trim()) return false;
  const a = last10(left);
  const b = last10(right);
  return Boolean(a && b && a === b);
}

export async function getUserByPhone(phone: string): Promise<User | undefined> {
  const needle = last10(phone);
  if (!needle) return undefined;
  const [rows] = await pool.query<UserRow[]>("SELECT * FROM users");
  return rows.map(mapUser).find((user) => last10(user.phone_number) === needle);
}

async function uniqueUsername(base: string): Promise<string> {
  const cleaned = base.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "member";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? cleaned : `${cleaned}${attempt}`;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT 1 AS ok FROM users WHERE username = :username LIMIT 1",
      { username: candidate },
    );
    if (!rows.length) return candidate;
  }
  return `${cleaned}${Date.now().toString().slice(-4)}`;
}

function dateOrNull(value?: string) {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export async function createCareRecipient(
  registration: CareRecipientRegistration,
): Promise<CreateCareRecipientResponse> {
  const recipient = registration.recipient;
  if (!recipient.full_name.trim()) {
    throw new HttpError(400, "Care Recipient full name is required.");
  }
  if (!recipient.mobile.trim()) {
    throw new HttpError(400, "Care Recipient mobile number is required.");
  }
  if (!recipient.address.trim()) {
    throw new HttpError(400, "Residential address is required.");
  }
  if (!registration.office.plan.trim()) {
    throw new HttpError(400, "Membership plan is required.");
  }
  if (!registration.consents.payment_acknowledged || !registration.consents.recipient_declared) {
    throw new HttpError(400, "Payment terms and Care Recipient declaration must be acknowledged.");
  }

  const existingPhone = await getUserByPhone(recipient.mobile.trim());
  if (existingPhone) {
    throw new HttpError(
      409,
      `Care Recipient mobile ${recipient.mobile.trim()} is already registered as ${existingPhone.full_name} (${existingPhone.username ?? existingPhone.user_id}). Open Members, or go back to Section A and use a different mobile.`,
    );
  }

  const familyMobile = registration.family_updates.mobile?.trim();
  if (registration.family_updates.create_login && phonesMatch(familyMobile, recipient.mobile)) {
    throw new HttpError(
      400,
      "Family mobile must be different from the Care Recipient mobile. Use the son/daughter’s number on Section F.",
    );
  }

  const userId = `user-${randomUUID()}`;
  const customerId = `cr-${randomUUID().slice(0, 8)}`;
  const username = await uniqueUsername(`${recipient.full_name}${recipient.mobile.replace(/\D/g, "").slice(-4)}`);
  const email = recipient.email?.trim() || `${username}@dayacares.member`;
  const now = new Date().toISOString();
  const contacts = [registration.emergency.primary, registration.emergency.secondary].filter(
    (contact): contact is NonNullable<typeof contact> => Boolean(contact?.name && contact.phone),
  );

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO users (
         user_id, username, cognito_sub, full_name, email, phone_number, password_hash, role, device_tokens, created_at
       ) VALUES (
         :user_id, :username, :cognito_sub, :full_name, :email, :phone_number, :password_hash, 'CUSTOMER', :device_tokens, :created_at
       )`,
      {
        user_id: userId,
        username,
        cognito_sub: `demo:${username}`,
        full_name: recipient.full_name.trim(),
        email,
        phone_number: recipient.mobile.trim(),
        password_hash: (await hashForCreate()).hash,
        device_tokens: JSON.stringify([]),
        created_at: now.slice(0, 23).replace("T", " "),
      },
    );

    await connection.query(
      `INSERT INTO customer_profiles (
         customer_id, user_id, address_durgapur, plan, landmark, date_of_birth, gender,
         care_recipient_type, emergency_contacts, medical_history, registration_payload, subscription_status
       ) VALUES (
         :customer_id, :user_id, :address, :plan, :landmark, :date_of_birth, :gender,
         :care_recipient_type, CAST(:emergency_contacts AS JSON), CAST(:medical_history AS JSON),
         CAST(:registration_payload AS JSON), 'ACTIVE'
       )`,
      {
        customer_id: customerId,
        user_id: userId,
        address: recipient.address.trim(),
        plan: registration.office.plan,
        landmark: recipient.landmark?.trim() || null,
        date_of_birth: dateOrNull(recipient.date_of_birth),
        gender: recipient.gender || null,
        care_recipient_type: registration.office.recipient_type,
        emergency_contacts: JSON.stringify(
          contacts.map((contact) => ({
            name: contact.name,
            relationship: contact.relationship,
            phone: contact.phone,
          })),
        ),
        medical_history: JSON.stringify({
          preexisting_conditions: registration.medical.conditions,
          blood_group: recipient.blood_group,
          primary_physician: registration.healthcare.primary_doctor,
          notes: [registration.medical.other_conditions, registration.medical.allergies]
            .filter(Boolean)
            .join(" · "),
        }),
        registration_payload: JSON.stringify(registration),
      },
    );

    let family: CreateCareRecipientResponse["family"];
    const familyMobile = registration.family_updates.mobile?.trim();
    const familyName = registration.family_updates.name?.trim();
    if (registration.family_updates.create_login && familyName && familyMobile) {
      const existingFamily = await getUserByPhone(familyMobile);
      let familyUserId: string;
      let familyUsername: string;
      let linkedExisting = false;
      if (existingFamily) {
        if (existingFamily.role !== "FAMILY") {
          throw new HttpError(
            409,
            `Family mobile ${familyMobile} already belongs to ${existingFamily.full_name} (${existingFamily.role.toLowerCase()} login ${existingFamily.username ?? existingFamily.user_id}). Use a different family number.`,
          );
        }
        familyUserId = existingFamily.user_id;
        familyUsername = existingFamily.username ?? existingFamily.cognito_sub.replace(/^demo:/, "");
        linkedExisting = true;
      } else {
        familyUserId = `user-${randomUUID()}`;
        familyUsername = await uniqueUsername(`${familyName}${familyMobile.replace(/\D/g, "").slice(-4)}`);
        await connection.query(
          `INSERT INTO users (
             user_id, username, cognito_sub, full_name, email, phone_number, password_hash, role, device_tokens, created_at
           ) VALUES (
             :user_id, :username, :cognito_sub, :full_name, :email, :phone_number, :password_hash, 'FAMILY', :device_tokens, :created_at
           )`,
          {
            user_id: familyUserId,
            username: familyUsername,
            cognito_sub: `demo:${familyUsername}`,
            full_name: familyName,
            email: registration.family_updates.email?.trim() || `${familyUsername}@dayacares.family`,
            phone_number: familyMobile,
            password_hash: (await hashForCreate()).hash,
            device_tokens: JSON.stringify([]),
            created_at: now.slice(0, 23).replace("T", " "),
          },
        );
      }
      await connection.query(
        `INSERT INTO family_mappings (
           mapping_id, family_user_id, customer_id, relationship, access_granted_at
         ) VALUES (
           :mapping_id, :family_user_id, :customer_id, :relationship, :access_granted_at
         )`,
        {
          mapping_id: `map-${randomUUID()}`,
          family_user_id: familyUserId,
          customer_id: customerId,
          relationship: registration.family_updates.relationship?.trim() || "Family",
          access_granted_at: now.slice(0, 23).replace("T", " "),
        },
      );
      family = {
        user_id: familyUserId,
        username: familyUsername,
        full_name: familyName,
        linked_existing: linkedExisting,
      };
    }

    const workerId = registration.consents.assign_worker_id;
    if (workerId) {
      const worker = await getUserById(workerId);
      if (!worker || worker.role !== "WORKER") {
        throw new HttpError(400, "Assigned Care Giver was not found.");
      }
      await connection.query(
        `INSERT INTO worker_allocations (allocation_id, worker_id, customer_id, allocated_at)
         VALUES (:allocation_id, :worker_id, :customer_id, :allocated_at)`,
        {
          allocation_id: `alloc-${randomUUID()}`,
          worker_id: workerId,
          customer_id: customerId,
          allocated_at: now.slice(0, 23).replace("T", " "),
        },
      );
    }

    await connection.commit();
    return {
      customer: {
        customer_id: customerId,
        user_id: userId,
        name: recipient.full_name.trim(),
        address: recipient.address.trim(),
        plan: registration.office.plan,
        subscription_status: "ACTIVE",
      },
      family,
      assigned_worker_id: workerId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

interface AllocationRow extends RowDataPacket {
  allocation_id: string;
  worker_id: string;
  worker_name: string;
  customer_id: string;
  customer_name: string;
  address: string;
  plan: string | null;
  subscription_status: SubscriptionStatus;
}

interface ScheduleRow extends RowDataPacket {
  schedule_id: string;
  customer_id: string;
  customer_name: string;
  customer_address: string;
  worker_id: string;
  worker_name: string;
  scheduled_for: Date | string;
  duration_minutes: number;
  visit_type: VisitType;
  notes: string | null;
  status: VisitScheduleStatus;
}

function mapRoutedMember(row: AllocationRow, includeAllocation: boolean): RoutedMember {
  return {
    customer_id: row.customer_id,
    name: row.customer_name,
    address: row.address,
    plan: row.plan ?? undefined,
    subscription_status: row.subscription_status,
    allocation_id: includeAllocation ? row.allocation_id : undefined,
    worker_id: includeAllocation ? row.worker_id : undefined,
    worker_name: includeAllocation ? row.worker_name : undefined,
  };
}

function mapSchedule(row: ScheduleRow): VisitSchedule {
  return {
    schedule_id: row.schedule_id,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    customer_address: row.customer_address,
    worker_id: row.worker_id,
    worker_name: row.worker_name,
    scheduled_for: iso(row.scheduled_for),
    duration_minutes: row.duration_minutes,
    visit_type: row.visit_type,
    notes: row.notes ?? undefined,
    status: row.status,
  };
}

const SCHEDULE_SELECT = `SELECT
       s.schedule_id,
       s.customer_id,
       u.full_name AS customer_name,
       c.address_durgapur AS customer_address,
       s.worker_id,
       w.full_name AS worker_name,
       s.scheduled_for,
       s.duration_minutes,
       s.visit_type,
       s.notes,
       s.status
     FROM visit_schedules s
     JOIN customer_profiles c ON c.customer_id = s.customer_id
     JOIN users u ON u.user_id = c.user_id
     JOIN users w ON w.user_id = s.worker_id`;

export async function getRoutingBoard(): Promise<RoutingBoardResponse> {
  const workers = await listWorkers();
  const [allocationRows] = await pool.query<AllocationRow[]>(
    `SELECT
       a.allocation_id,
       a.worker_id,
       w.full_name AS worker_name,
       c.customer_id,
       u.full_name AS customer_name,
       c.address_durgapur AS address,
       c.plan,
       c.subscription_status
     FROM worker_allocations a
     JOIN users w ON w.user_id = a.worker_id
     JOIN customer_profiles c ON c.customer_id = a.customer_id
     JOIN users u ON u.user_id = c.user_id
     ORDER BY w.full_name, u.full_name`,
  );
  const [unassignedRows] = await pool.query<AllocationRow[]>(
    `SELECT
       '' AS allocation_id,
       '' AS worker_id,
       '' AS worker_name,
       c.customer_id,
       u.full_name AS customer_name,
       c.address_durgapur AS address,
       c.plan,
       c.subscription_status
     FROM customer_profiles c
     JOIN users u ON u.user_id = c.user_id
     WHERE NOT EXISTS (
       SELECT 1 FROM worker_allocations a WHERE a.customer_id = c.customer_id
     )
     ORDER BY u.full_name`,
  );

  return {
    workers: workers.map((worker) => ({
      user_id: worker.user_id,
      name: worker.name,
      members: allocationRows
        .filter((row) => row.worker_id === worker.user_id)
        .map((row) => mapRoutedMember(row, true)),
    })),
    unassigned: unassignedRows.map((row) => mapRoutedMember(row, false)),
  };
}

export async function assignWorker(workerId: string, customerId: string) {
  const worker = await getUserById(workerId);
  if (!worker || worker.role !== "WORKER") {
    throw new HttpError(400, "Assigned Care Giver was not found.");
  }
  await getCustomer(customerId);
  const allocationId = `alloc-${randomUUID()}`;
  try {
    await pool.query(
      `INSERT INTO worker_allocations (allocation_id, worker_id, customer_id, allocated_at)
       VALUES (:allocation_id, :worker_id, :customer_id, :allocated_at)`,
      {
        allocation_id: allocationId,
        worker_id: workerId,
        customer_id: customerId,
        allocated_at: mysqlDate(new Date().toISOString()),
      },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new HttpError(409, "This Care Giver is already assigned to that Care Recipient.");
    }
    throw error;
  }
  return { allocation_id: allocationId, worker_id: workerId, customer_id: customerId };
}

export async function unassignWorker(allocationId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT allocation_id FROM worker_allocations WHERE allocation_id = :allocationId LIMIT 1",
    { allocationId },
  );
  if (!rows.length) {
    throw new HttpError(404, "Assignment was not found.");
  }
  await pool.query("DELETE FROM worker_allocations WHERE allocation_id = :allocationId", { allocationId });
}

export async function ensureWorkerAllocated(workerId: string, customerId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 AS ok FROM worker_allocations
     WHERE worker_id = :workerId AND customer_id = :customerId LIMIT 1`,
    { workerId, customerId },
  );
  if (!rows.length) {
    await assignWorker(workerId, customerId);
  }
}

function dayBounds(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(400, "date must be YYYY-MM-DD.");
  }
  return { start: `${date} 00:00:00.000`, end: `${date} 23:59:59.999` };
}

export async function listSchedulesForUser(user: User, date: string): Promise<VisitSchedule[]> {
  const { start, end } = dayBounds(date);
  let sql = `${SCHEDULE_SELECT}
     WHERE s.scheduled_for BETWEEN :start AND :end`;
  const params: Record<string, string> = { start, end };

  if (user.role === "WORKER") {
    sql += " AND s.worker_id = :userId";
    params.userId = user.user_id;
  } else if (user.role === "CUSTOMER") {
    sql += " AND c.user_id = :userId";
    params.userId = user.user_id;
  } else if (user.role === "FAMILY") {
    sql += ` AND s.customer_id IN (
      SELECT customer_id FROM family_mappings WHERE family_user_id = :userId
    )`;
    params.userId = user.user_id;
  }

  sql += " ORDER BY s.scheduled_for, w.full_name";
  const [rows] = await pool.query<ScheduleRow[]>(sql, params);
  return rows.map(mapSchedule);
}

export async function listUpcomingSchedules(user: User, limit = 6): Promise<VisitSchedule[]> {
  const customers = await listCustomersForUser(user);
  const customerIds = customers.map((customer) => customer.customer_id);
  if (!customerIds.length && user.role !== "ADMIN" && user.role !== "WORKER") return [];

  let sql = `${SCHEDULE_SELECT}
     WHERE s.status = 'SCHEDULED' AND s.scheduled_for >= NOW()`;
  const params: Record<string, string> = {};

  if (user.role === "WORKER") {
    sql += " AND s.worker_id = :userId";
    params.userId = user.user_id;
  } else if (user.role === "ADMIN") {
    // all upcoming
  } else if (customerIds.length) {
    const inClause = inParams(customerIds, "sid");
    sql += ` AND s.customer_id IN (${inClause.sql})`;
    Object.assign(params, inClause.params);
  } else {
    return [];
  }

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  sql += ` ORDER BY s.scheduled_for LIMIT ${safeLimit}`;
  const [rows] = await pool.query<ScheduleRow[]>(sql, params);
  return rows.map(mapSchedule);
}

function addMinutes(wallClock: string, minutes: number) {
  const match = wallClock.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) {
    throw new HttpError(400, "scheduled_for must be a valid date and time.");
  }
  const start = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  const end = new Date(start + minutes * 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())} ${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}:${pad(end.getUTCSeconds())}.000`;
}

async function assertNoOverlap(
  workerId: string,
  scheduledFor: string,
  durationMinutes: number,
  ignoreId?: string,
) {
  const start = mysqlWallClock(scheduledFor);
  const end = addMinutes(start, durationMinutes);
  const [rows] = await pool.query<ScheduleRow[]>(
    `${SCHEDULE_SELECT}
     WHERE s.worker_id = :workerId AND s.status = 'SCHEDULED'
     AND s.scheduled_for < :end
     AND DATE_ADD(s.scheduled_for, INTERVAL s.duration_minutes MINUTE) > :start
     ${ignoreId ? "AND s.schedule_id <> :ignoreId" : ""}
     LIMIT 1`,
    { workerId, start, end, ignoreId },
  );
  if (rows[0]) {
    const clash = mapSchedule(rows[0]);
    throw new HttpError(
      409,
      `That Care Giver already has ${clash.customer_name} at ${formatVisitClock(clash.scheduled_for)}.`,
    );
  }
}

function formatVisitClock(value: string) {
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 || 12;
  return `${twelve}:${match[2]} ${suffix}`;
}

export async function createSchedule(body: CreateScheduleRequest): Promise<VisitSchedule> {
  const worker = await getUserById(body.worker_id);
  if (!worker || worker.role !== "WORKER") {
    throw new HttpError(400, "Assigned Care Giver was not found.");
  }
  await getCustomer(body.customer_id);
  const duration = body.duration_minutes && body.duration_minutes > 0 ? Math.min(body.duration_minutes, 240) : 45;
  const visitType: VisitType = body.visit_type ?? "HOME_VISIT";
  await assertNoOverlap(body.worker_id, body.scheduled_for, duration);
  await ensureWorkerAllocated(body.worker_id, body.customer_id);

  const scheduleId = `sched-${randomUUID()}`;
  await pool.query(
    `INSERT INTO visit_schedules (
       schedule_id, customer_id, worker_id, scheduled_for, duration_minutes, visit_type, notes, status, created_at
     ) VALUES (
       :schedule_id, :customer_id, :worker_id, :scheduled_for, :duration_minutes, :visit_type, :notes, 'SCHEDULED', :created_at
     )`,
    {
      schedule_id: scheduleId,
      customer_id: body.customer_id,
      worker_id: body.worker_id,
      scheduled_for: mysqlWallClock(body.scheduled_for),
      duration_minutes: duration,
      visit_type: visitType,
      notes: body.notes?.trim() || null,
      created_at: mysqlDate(new Date().toISOString()),
    },
  );
  const created = await getSchedule(scheduleId);
  if (!created) {
    throw new HttpError(500, "Visit was saved but could not be reloaded.");
  }
  return created;
}

export async function getSchedule(scheduleId: string): Promise<VisitSchedule | undefined> {
  const [rows] = await pool.query<ScheduleRow[]>(
    `${SCHEDULE_SELECT} WHERE s.schedule_id = :scheduleId LIMIT 1`,
    { scheduleId },
  );
  return rows[0] ? mapSchedule(rows[0]) : undefined;
}

export async function updateSchedule(scheduleId: string, body: UpdateScheduleRequest): Promise<VisitSchedule> {
  const existing = await getSchedule(scheduleId);
  if (!existing) {
    throw new HttpError(404, "Scheduled visit was not found.");
  }
  if (existing.status !== "SCHEDULED" && body.status !== "SCHEDULED") {
    throw new HttpError(400, "Only a scheduled visit can be updated.");
  }
  const nextWorker = body.worker_id ?? existing.worker_id;
  const nextWhen = body.scheduled_for ?? existing.scheduled_for;
  const nextDuration = body.duration_minutes ?? existing.duration_minutes;
  if (body.worker_id) {
    const worker = await getUserById(body.worker_id);
    if (!worker || worker.role !== "WORKER") {
      throw new HttpError(400, "Assigned Care Giver was not found.");
    }
    await ensureWorkerAllocated(body.worker_id, existing.customer_id);
  }
  if (body.status !== "CANCELLED") {
    await assertNoOverlap(nextWorker, nextWhen, nextDuration, scheduleId);
  }
  await pool.query(
    `UPDATE visit_schedules SET
       worker_id = :worker_id,
       scheduled_for = :scheduled_for,
       duration_minutes = :duration_minutes,
       notes = :notes,
       status = :status
     WHERE schedule_id = :schedule_id`,
    {
      schedule_id: scheduleId,
      worker_id: nextWorker,
      scheduled_for: mysqlWallClock(nextWhen),
      duration_minutes: nextDuration,
      notes: body.notes !== undefined ? body.notes.trim() || null : existing.notes ?? null,
      status: body.status ?? existing.status,
    },
  );
  const updated = await getSchedule(scheduleId);
  if (!updated) {
    throw new HttpError(500, "Visit was updated but could not be reloaded.");
  }
  return updated;
}

interface InvoiceRow extends RowDataPacket {
  invoice_id: string;
  customer_id: string;
  customer_name: string;
  plan: string | null;
  period_label: string;
  description: string;
  amount_inr: number;
  status: InvoiceStatus;
  due_on: Date | string;
  paid_on: Date | string | null;
  payment_mode: string | null;
  reference: string | null;
}

interface SosRow extends RowDataPacket {
  incident_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_address: string | null;
  raised_by: string;
  raised_by_name: string;
  severity: SosSeverity;
  status: SosStatus;
  notes: string | null;
  assigned_worker_id: string | null;
  assigned_worker_name: string | null;
  created_at: Date | string;
  emergency_contacts: EmergencyContact[] | string | null;
}

function dateOnly(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapInvoice(row: InvoiceRow): MembershipInvoice {
  return {
    invoice_id: row.invoice_id,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    plan: row.plan ?? undefined,
    period_label: row.period_label,
    description: row.description,
    amount_inr: Number(row.amount_inr),
    status: row.status,
    due_on: dateOnly(row.due_on),
    paid_on: row.paid_on ? dateOnly(row.paid_on) : undefined,
    payment_mode: row.payment_mode ?? undefined,
    reference: row.reference ?? undefined,
  };
}

function mapSos(row: SosRow): SosIncident {
  return {
    incident_id: row.incident_id,
    customer_id: row.customer_id ?? undefined,
    customer_name: row.customer_name ?? undefined,
    customer_address: row.customer_address ?? undefined,
    raised_by: row.raised_by,
    raised_by_name: row.raised_by_name,
    severity: row.severity,
    status: row.status,
    notes: row.notes ?? undefined,
    assigned_worker_id: row.assigned_worker_id ?? undefined,
    assigned_worker_name: row.assigned_worker_name ?? undefined,
    created_at: iso(row.created_at),
    emergency_contacts: parseJson(row.emergency_contacts, []),
  };
}

const INVOICE_SELECT = `SELECT
       i.invoice_id, i.customer_id, u.full_name AS customer_name, c.plan,
       i.period_label, i.description, i.amount_inr, i.status, i.due_on, i.paid_on,
       i.payment_mode, i.reference
     FROM membership_invoices i
     JOIN customer_profiles c ON c.customer_id = i.customer_id
     JOIN users u ON u.user_id = c.user_id`;

const SOS_SELECT = `SELECT
       s.incident_id, s.customer_id, u.full_name AS customer_name, c.address_durgapur AS customer_address,
       s.raised_by, s.raised_by_name, s.severity, s.status, s.notes,
       s.assigned_worker_id, w.full_name AS assigned_worker_name, s.created_at,
       c.emergency_contacts
     FROM sos_incidents s
     LEFT JOIN customer_profiles c ON c.customer_id = s.customer_id
     LEFT JOIN users u ON u.user_id = c.user_id
     LEFT JOIN users w ON w.user_id = s.assigned_worker_id`;

export async function getBillingBoard(): Promise<BillingBoardResponse> {
  const customers = await listCustomersForUser({
    user_id: "user-admin",
    cognito_sub: "demo:admin",
    full_name: "Centre Manager",
    email: "",
    phone_number: "",
    role: "ADMIN",
    device_tokens: [],
    created_at: new Date().toISOString(),
  });
  const [invoiceRows] = await pool.query<InvoiceRow[]>(`${INVOICE_SELECT} ORDER BY i.due_on DESC, u.full_name`);
  const invoices = invoiceRows.map(mapInvoice);
  const accounts = customers.map((customer) => {
    const memberInvoices = invoices.filter((invoice) => invoice.customer_id === customer.customer_id);
    const due_inr = memberInvoices
      .filter((invoice) => invoice.status === "DUE")
      .reduce((sum, invoice) => sum + invoice.amount_inr, 0);
    return {
      customer_id: customer.customer_id,
      name: customer.name,
      address: customer.address,
      plan: customer.plan,
      subscription_status: customer.subscription_status,
      monthly_fee_inr: monthlyFeeForPlan(customer.plan),
      due_inr,
      invoices: memberInvoices,
    };
  });
  return {
    accounts,
    due_count: accounts.filter((account) => account.due_inr > 0).length,
    due_inr: accounts.reduce((sum, account) => sum + account.due_inr, 0),
  };
}

export async function createInvoice(body: CreateInvoiceRequest): Promise<MembershipInvoice> {
  await getCustomer(body.customer_id);
  const [profile] = await pool.query<(RowDataPacket & { plan: string | null })[]>(
    "SELECT plan FROM customer_profiles WHERE customer_id = :customerId LIMIT 1",
    { customerId: body.customer_id },
  );
  const period = body.period_label?.trim() || currentPeriodLabel();
  const amount = body.amount_inr && body.amount_inr > 0 ? Math.round(body.amount_inr) : monthlyFeeForPlan(profile[0]?.plan);
  const invoiceId = `inv-${randomUUID()}`;
  await pool.query(
    `INSERT INTO membership_invoices (
       invoice_id, customer_id, period_label, description, amount_inr, status, due_on, created_at
     ) VALUES (
       :invoice_id, :customer_id, :period_label, :description, :amount_inr, 'DUE', :due_on, :created_at
     )`,
    {
      invoice_id: invoiceId,
      customer_id: body.customer_id,
      period_label: period,
      description: body.description?.trim() || `${profile[0]?.plan ?? "Membership"} monthly membership`,
      amount_inr: amount,
      due_on: body.due_on?.trim() || `${new Date().toISOString().slice(0, 8)}05`,
      created_at: mysqlDate(new Date().toISOString()),
    },
  );
  const created = await getInvoice(invoiceId);
  if (!created) throw new HttpError(500, "Invoice was saved but could not be reloaded.");
  return created;
}

export async function getInvoice(invoiceId: string): Promise<MembershipInvoice | undefined> {
  const [rows] = await pool.query<InvoiceRow[]>(`${INVOICE_SELECT} WHERE i.invoice_id = :invoiceId LIMIT 1`, {
    invoiceId,
  });
  return rows[0] ? mapInvoice(rows[0]) : undefined;
}

export async function updateInvoice(invoiceId: string, body: UpdateInvoiceRequest): Promise<MembershipInvoice> {
  const existing = await getInvoice(invoiceId);
  if (!existing) throw new HttpError(404, "Invoice was not found.");
  const status = body.status ?? existing.status;
  await pool.query(
    `UPDATE membership_invoices SET
       status = :status,
       paid_on = :paid_on,
       payment_mode = :payment_mode,
       reference = :reference
     WHERE invoice_id = :invoice_id`,
    {
      invoice_id: invoiceId,
      status,
      paid_on: status === "PAID" ? new Date().toISOString().slice(0, 10) : null,
      payment_mode: body.payment_mode?.trim() || (status === "PAID" ? existing.payment_mode ?? "UPI" : null),
      reference: body.reference?.trim() || existing.reference || null,
    },
  );
  const updated = await getInvoice(invoiceId);
  if (!updated) throw new HttpError(500, "Invoice was updated but could not be reloaded.");
  return updated;
}

export async function updateSubscription(customerId: string, status: SubscriptionStatus) {
  if (!["ACTIVE", "PAUSED", "INACTIVE"].includes(status)) {
    throw new HttpError(400, "Subscription status must be ACTIVE, PAUSED, or INACTIVE.");
  }
  await getCustomer(customerId);
  await pool.query(
    "UPDATE customer_profiles SET subscription_status = :status WHERE customer_id = :customerId",
    { status, customerId },
  );
}

export async function getSos(incidentId: string): Promise<SosIncident | undefined> {
  const [rows] = await pool.query<SosRow[]>(`${SOS_SELECT} WHERE s.incident_id = :incidentId LIMIT 1`, { incidentId });
  return rows[0] ? mapSos(rows[0]) : undefined;
}

export async function listSosForUser(user: User): Promise<SosIncident[]> {
  let sql = `${SOS_SELECT} WHERE 1 = 1`;
  const params: Record<string, string> = {};
  if (user.role === "WORKER") {
    sql += " AND (s.assigned_worker_id = :userId OR s.raised_by = :userId)";
    params.userId = user.user_id;
  } else if (user.role !== "ADMIN") {
    const customers = await listCustomersForUser(user);
    const ids = customers.map((customer) => customer.customer_id);
    if (!ids.length) return [];
    const inClause = inParams(ids, "sos");
    sql += ` AND (s.customer_id IN (${inClause.sql}) OR s.raised_by = :userId)`;
    Object.assign(params, inClause.params, { userId: user.user_id });
  }
  sql += " ORDER BY FIELD(s.status, 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'), s.created_at DESC";
  const [rows] = await pool.query<SosRow[]>(sql, params);
  return rows.map(mapSos);
}

export async function listOpenSosForUser(user: User): Promise<SosIncident[]> {
  return (await listSosForUser(user)).filter((incident) => incident.status !== "RESOLVED").slice(0, 6);
}

export async function createSos(user: User, body: CreateSosRequest): Promise<SosIncident> {
  let customerId = body.customer_id;
  if (!customerId) {
    const customers = await listCustomersForUser(user);
    customerId = customers[0]?.customer_id;
  }
  if (customerId) {
    await assertCanAccessCustomer(user, customerId);
  } else if (user.role !== "ADMIN") {
    throw new HttpError(400, "No Care Recipient is linked to this login.");
  }
  const severity: SosSeverity = body.severity ?? "SOS";
  const incidentId = `sos-${randomUUID()}`;
  await pool.query(
    `INSERT INTO sos_incidents (
       incident_id, customer_id, raised_by, raised_by_name, severity, status, notes, created_at
     ) VALUES (
       :incident_id, :customer_id, :raised_by, :raised_by_name, :severity, 'OPEN', :notes, :created_at
     )`,
    {
      incident_id: incidentId,
      customer_id: customerId ?? null,
      raised_by: user.user_id,
      raised_by_name: user.full_name,
      severity,
      notes: body.notes?.trim() || null,
      created_at: mysqlDate(new Date().toISOString()),
    },
  );
  const created = await getSos(incidentId);
  if (!created) throw new HttpError(500, "SOS was saved but could not be reloaded.");
  return created;
}

export async function updateSos(incidentId: string, body: UpdateSosRequest): Promise<SosIncident> {
  const existing = await getSos(incidentId);
  if (!existing) throw new HttpError(404, "Emergency was not found.");
  if (body.assigned_worker_id) {
    const worker = await getUserById(body.assigned_worker_id);
    if (!worker || worker.role !== "WORKER") {
      throw new HttpError(400, "Assigned Care Giver was not found.");
    }
    if (existing.customer_id) {
      await ensureWorkerAllocated(body.assigned_worker_id, existing.customer_id);
    }
  }
  await pool.query(
    `UPDATE sos_incidents SET
       status = :status,
       assigned_worker_id = :assigned_worker_id,
       notes = :notes
     WHERE incident_id = :incident_id`,
    {
      incident_id: incidentId,
      status: body.status ?? existing.status,
      assigned_worker_id:
        body.assigned_worker_id === null ? null : body.assigned_worker_id ?? existing.assigned_worker_id ?? null,
      notes: body.notes !== undefined ? body.notes.trim() || null : existing.notes ?? null,
    },
  );
  const updated = await getSos(incidentId);
  if (!updated) throw new HttpError(500, "Emergency was updated but could not be reloaded.");
  return updated;
}
