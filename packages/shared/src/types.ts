export const USER_ROLES = ["CUSTOMER", "WORKER", "FAMILY", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ENTRY_SOURCES = ["WEB", "ANDROID_APP", "IOS_APP"] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

export const SUGAR_TEST_TYPES = [
  "FASTING",
  "POST_PRANDIAL",
  "RANDOM",
  "HBA1C_PROXY",
] as const;
export type SugarTestType = (typeof SUGAR_TEST_TYPES)[number];

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "INACTIVE"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PUSH_PLATFORMS = ["ANDROID", "IOS", "WEB"] as const;
export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

export interface DeviceToken {
  platform: PushPlatform;
  token: string;
}

export interface User {
  user_id: string;
  username?: string;
  cognito_sub: string;
  full_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  device_tokens: DeviceToken[];
  created_at: string;
}

export interface SessionUser {
  user_id: string;
  username: string;
  role: UserRole;
  name: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: SessionUser;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface MedicalHistory {
  preexisting_conditions?: string[];
  blood_group?: string;
  primary_physician?: string;
  notes?: string;
}

export interface CustomerProfile {
  customer_id: string;
  user_id: string;
  address_durgapur: string;
  emergency_contacts: EmergencyContact[];
  medical_history: MedicalHistory | string;
  subscription_status: SubscriptionStatus;
}

export interface FamilyMapping {
  mapping_id: string;
  family_user_id: string;
  customer_id: string;
  relationship: string;
  access_granted_at: string;
}

export interface VitalsPayload {
  systolic_bp?: number;
  diastolic_bp?: number;
  pulse_bpm?: number;
  spo2_percent?: number;
  blood_sugar_mgdl?: number;
  sugar_test_type?: SugarTestType;
  temperature_f?: number;
  weight_kg?: number;
}

export type MoodRating = 1 | 2 | 3 | 4 | 5;
export type DietaryCompliance = "GOOD" | "PARTIAL" | "POOR" | "UNKNOWN";
export type PhysicalMobility =
  | "INDEPENDENT"
  | "WALKING_STICK"
  | "WALKER"
  | "WHEELCHAIR"
  | "ASSISTED"
  | "OTHER";

export interface HomeVisitMonitoring {
  present?: string[];
  present_other?: string;
  present_name?: string;
  arrival_time?: string;
  departure_time?: string;
  appearance?: string;
  vs_previous?: string;
  what_changed?: string;
  recipient_concerns?: string;
  immediate_concern?: "NO" | "YES";
  urgent_flags?: string[];
  urgent_other?: string;
  urgent_actions?: string[];
  escalation_time?: string;
  unusual_observation?: string;
  general_observation?: string[];
  general_other?: string;
  med_list_available?: "YES" | "NO";
  med_list_changed?: "NO" | "YES";
  med_changes?: string;
  med_adherence?: string;
  med_concern?: "NO" | "YES";
  med_concern_details?: string;
  med_stock?: string;
  med_action?: string[];
  appetite?: string;
  fluid_intake?: string;
  meals?: string;
  sleep?: string;
  routine_notes?: string;
  mobility_current?: string;
  mobility_change?: string;
  mobility_difficulty?: string[];
  fall_since_last?: "NO" | "YES";
  fall_when?: string;
  fall_injury?: string;
  fall_action?: string;
  new_safety_concern?: "NO" | "YES";
  safety_details?: string;
  safety_recommendation?: string;
  hygiene?: string;
  bathing?: string;
  dressing?: string;
  toileting?: string;
  eating?: string;
  moving_home?: string;
  selfcare_change?: "NO" | "YES";
  selfcare_details?: string;
  mental_appear?: string[];
  mental_other?: string;
  social?: string[];
  expressed?: string[];
  mental_comments?: string;
  mental_action?: string[];
  upcoming?: string[];
  upcoming_other?: string;
  upcoming_date?: string;
  pending_investigations?: "NONE" | "YES";
  pending_details?: string;
  healthcare_followup?: "NO" | "YES";
  healthcare_followup_details?: string;
  contacts_verified?: string;
  contacts_change?: string;
  family_comm?: string;
  family_contacted?: string;
  family_time?: string;
  family_mode?: string;
  requests?: string[];
  requests_other?: string;
  request_details?: string;
  immediate_action?: string[];
  immediate_other?: string;
  followup_window?: string;
  followup_date?: string;
  overall_status?: "STABLE" | "ATTENTION" | "URGENT";
  visit_summary?: string;
  increased_monitoring?: string;
  monitoring_reason?: string;
  feedback?: string;
  feedback_notes?: string;
  ack_name?: string;
  ack_role?: string;
}

export interface QualitativeObservations {
  mood_rating?: MoodRating;
  dietary_compliance?: DietaryCompliance;
  physical_mobility?: PhysicalMobility;
  worker_notes?: string;
  action_items_needed?: boolean;
  monitoring?: HomeVisitMonitoring;
}

export interface HealthVisitLog {
  log_id: string;
  customer_id: string;
  worker_id: string;
  visit_timestamp: string;
  entry_source: EntrySource;
  vitals_payload: VitalsPayload;
  qualitative_observations: QualitativeObservations;
  visit_photo_s3_url?: string;
  created_at: string;
}

export interface CreateHealthVisitLogRequest {
  log_id?: string;
  customer_id: string;
  visit_timestamp?: string;
  entry_source: EntrySource;
  vitals_payload: VitalsPayload;
  qualitative_observations: QualitativeObservations;
  visit_photo_s3_url?: string;
}

export interface CreateHealthVisitLogResponse {
  log: HealthVisitLog;
  alert: VisitAlertResult;
}

export interface CustomerSummary {
  customer_id: string;
  user_id: string;
  name: string;
  address: string;
  plan?: string;
  subscription_status: SubscriptionStatus;
}

export interface ListCustomersResponse {
  customers: CustomerSummary[];
}

export interface ListHealthVisitLogsResponse {
  logs: HomeVisitSummary[];
}

export interface GetHealthVisitLogResponse {
  visit: HomeVisitSummary;
}

export interface HomeVisitSummary {
  log: HealthVisitLog;
  customer_name: string;
  worker_name: string;
  address: string;
}

export interface CareTeamPerson {
  user_id: string;
  name: string;
  role_label: string;
  initials: string;
  email?: string;
  role?: UserRole;
}

export interface HomeSummaryResponse {
  customers: CustomerSummary[];
  logs: HomeVisitSummary[];
  team: CareTeamPerson[];
  schedules?: VisitSchedule[];
  open_sos?: SosIncident[];
}

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface VisitAlertResult {
  severity: AlertSeverity;
  flags: string[];
  notified_family_user_ids: string[];
  channels: Array<"PUSH" | "WHATSAPP" | "SMS">;
}

export interface RegistrationContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  alternate_phone?: string;
  city?: string;
}

export interface CareRecipientRegistration {
  office: {
    registration_date?: string;
    service_commences_on?: string;
    plan: string;
    recipient_type: "INDIVIDUAL" | "COMPANION";
    registration_fee?: string;
    monthly_fee?: string;
    payment_mode?: string;
    payment_date?: string;
    payment_reference?: string;
  };
  recipient: {
    full_name: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    height_in?: string;
    weight_kg?: string;
    spo2?: string;
    pulse?: string;
    bp?: string;
    sugar?: string;
    mobile: string;
    alternate_mobile?: string;
    email?: string;
    hobby?: string;
    address: string;
    landmark?: string;
  };
  emergency: {
    primary: RegistrationContact;
    secondary?: RegistrationContact;
    extra_name?: string;
    extra_phone?: string;
    approach?: "COORDINATE" | "CONTACT_ADDITIONAL";
  };
  medical: {
    conditions: string[];
    other_conditions?: string;
    mobility?: string;
    allergies?: string;
    medications?: string;
    regular_supervision?: boolean;
    physiotherapy?: boolean;
    aaya?: boolean;
  };
  healthcare: {
    primary_doctor?: string;
    primary_speciality?: string;
    primary_hospital?: string;
    primary_contact?: string;
    preferred_hospital?: string;
    insurance?: boolean;
    insurer?: string;
    policy_number?: string;
  };
  family_updates: {
    name?: string;
    relationship?: string;
    mobile?: string;
    email?: string;
    create_login?: boolean;
  };
  consents: {
    payment_acknowledged: boolean;
    recipient_declared: boolean;
    documents: string[];
    assign_worker_id?: string;
  };
}

export interface CreateCareRecipientRequest {
  registration: CareRecipientRegistration;
}

export interface CreateCareRecipientResponse {
  customer: CustomerSummary;
  family?: {
    user_id: string;
    username: string;
    full_name: string;
    linked_existing: boolean;
  };
  assigned_worker_id?: string;
}

export interface WorkerSummary {
  user_id: string;
  name: string;
}

export interface ListWorkersResponse {
  workers: WorkerSummary[];
}

export interface DirectoryUser {
  user_id: string;
  username?: string;
  full_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  created_at: string;
  address?: string;
}

export interface ListUsersResponse {
  users: DirectoryUser[];
}

export interface CreateDirectoryUserRequest {
  full_name: string;
  phone_number: string;
  email?: string;
  role: UserRole;
  address?: string;
  password?: string;
}

export interface CreateDirectoryUserResponse extends DirectoryUser {
  temporary_password?: string;
}

export interface UpdateDirectoryUserRequest {
  full_name?: string;
  phone_number?: string;
  email?: string;
  role?: UserRole;
  address?: string;
  password?: string;
}

export interface UpdateOwnProfileRequest {
  full_name?: string;
  phone_number?: string;
  email?: string;
  password?: string;
  address?: string;
}

export const NOTIFICATION_KINDS = ["SOS", "VISIT_ALERT"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface AppNotification {
  notification_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  related_type?: "SOS" | "VISIT";
  related_id?: string;
  customer_id?: string;
  href?: string;
  read_at?: string;
  created_at: string;
}

export interface ListNotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
}

export interface UpdateNotificationRequest {
  read?: boolean;
}

export interface RoutedMember {
  customer_id: string;
  name: string;
  address: string;
  plan?: string;
  subscription_status: SubscriptionStatus;
  allocation_id?: string;
  worker_id?: string;
  worker_name?: string;
}

export interface WorkerCaseload {
  user_id: string;
  name: string;
  members: RoutedMember[];
}

export interface RoutingBoardResponse {
  workers: WorkerCaseload[];
  unassigned: RoutedMember[];
}

export interface AssignWorkerRequest {
  worker_id: string;
  customer_id: string;
}

export interface AssignWorkerResponse {
  allocation_id: string;
  worker_id: string;
  customer_id: string;
}

export const VISIT_SCHEDULE_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;
export type VisitScheduleStatus = (typeof VISIT_SCHEDULE_STATUSES)[number];

export const VISIT_TYPES = ["HOME_VISIT", "WELFARE_CALL", "FOLLOW_UP"] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export interface VisitSchedule {
  schedule_id: string;
  customer_id: string;
  customer_name: string;
  customer_address: string;
  worker_id: string;
  worker_name: string;
  scheduled_for: string;
  duration_minutes: number;
  visit_type: VisitType;
  notes?: string;
  status: VisitScheduleStatus;
}

export interface ListSchedulesResponse {
  date: string;
  schedules: VisitSchedule[];
}

export interface CreateScheduleRequest {
  customer_id: string;
  worker_id: string;
  scheduled_for: string;
  duration_minutes?: number;
  visit_type?: VisitType;
  notes?: string;
}

export interface UpdateScheduleRequest {
  status?: VisitScheduleStatus;
  scheduled_for?: string;
  worker_id?: string;
  duration_minutes?: number;
  notes?: string;
}

export const INVOICE_STATUSES = ["DUE", "PAID", "WAIVED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface MembershipInvoice {
  invoice_id: string;
  customer_id: string;
  customer_name: string;
  plan?: string;
  period_label: string;
  description: string;
  amount_inr: number;
  status: InvoiceStatus;
  due_on: string;
  paid_on?: string;
  payment_mode?: string;
  reference?: string;
}

export interface BillingAccount {
  customer_id: string;
  name: string;
  address: string;
  plan?: string;
  subscription_status: SubscriptionStatus;
  monthly_fee_inr: number;
  due_inr: number;
  invoices: MembershipInvoice[];
}

export interface BillingBoardResponse {
  accounts: BillingAccount[];
  due_count: number;
  due_inr: number;
}

export interface CreateInvoiceRequest {
  customer_id: string;
  amount_inr?: number;
  period_label?: string;
  description?: string;
  due_on?: string;
}

export interface UpdateInvoiceRequest {
  status?: InvoiceStatus;
  payment_mode?: string;
  reference?: string;
}

export interface UpdateSubscriptionRequest {
  subscription_status: SubscriptionStatus;
}

export const SOS_SEVERITIES = ["SOS", "FALL", "MEDICAL", "OTHER"] as const;
export type SosSeverity = (typeof SOS_SEVERITIES)[number];

export const SOS_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
export type SosStatus = (typeof SOS_STATUSES)[number];

export interface SosIncident {
  incident_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_address?: string;
  raised_by: string;
  raised_by_name: string;
  severity: SosSeverity;
  status: SosStatus;
  notes?: string;
  assigned_worker_id?: string;
  assigned_worker_name?: string;
  created_at: string;
  emergency_contacts: EmergencyContact[];
}

export interface ListSosResponse {
  incidents: SosIncident[];
}

export interface CreateSosRequest {
  customer_id?: string;
  severity?: SosSeverity;
  notes?: string;
}

export interface UpdateSosRequest {
  status?: SosStatus;
  assigned_worker_id?: string | null;
  notes?: string;
}

export const REPORT_FORM_KINDS = [
  "registration",
  "home-assessment",
  "home-visit",
  "shift-log",
] as const;
export type ReportFormKind = (typeof REPORT_FORM_KINDS)[number];

export interface ReportFormInfo {
  id: ReportFormKind;
  title: string;
  paper_file: string;
  needs_customer: boolean;
}

export interface ListReportFormsResponse {
  forms: ReportFormInfo[];
}
