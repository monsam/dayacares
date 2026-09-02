import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReportFormInfo, ReportFormKind } from "@daya/shared";
import type { FormSource } from "./db";

export const REPORT_FORMS: ReportFormInfo[] = [
  {
    id: "registration",
    title: "Care Recipient Registration Form",
    paper_file: "Registration Form.pdf",
    needs_customer: true,
  },
  {
    id: "home-assessment",
    title: "Home Assessment Form",
    paper_file: "Home Assesment Form.pdf",
    needs_customer: true,
  },
  {
    id: "home-visit",
    title: "Schedule Home Visit & Care Monitoring Form",
    paper_file: "Schedule Home Visit Form.pdf",
    needs_customer: true,
  },
  {
    id: "shift-log",
    title: "Shift Log Sheet",
    paper_file: "Shift Log Sheet.pdf",
    needs_customer: false,
  },
];

const navy = rgb(0, 0.23, 0.44);
const ink = rgb(0.11, 0.14, 0.19);
const muted = rgb(0.36, 0.4, 0.46);

function formsDir() {
  const candidates = [
    join(process.cwd(), "forms"),
    join(process.cwd(), "../../forms"),
    join(process.cwd(), "../forms"),
  ];
  return candidates.find((path) => existsSync(path)) ?? candidates[1];
}

export function blankFormPath(kind: ReportFormKind) {
  const form = REPORT_FORMS.find((item) => item.id === kind);
  if (!form) return undefined;
  const path = join(formsDir(), form.paper_file);
  return existsSync(path) ? path : undefined;
}

function dash(value?: string | number | null) {
  if (value === undefined || value === null || String(value).trim() === "") return "—";
  return String(value);
}

function wrap(text: string, width = 88) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ["—"];
}

class FormDoc {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 780;

  async init() {
    this.doc = await PDFDocument.create();
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.page = this.doc.addPage([595, 842]);
    return this;
  }

  private ensure(height = 24) {
    if (this.y < 64 + height) {
      this.page = this.doc.addPage([595, 842]);
      this.y = 780;
    }
  }

  header(title: string) {
    this.page.drawRectangle({ x: 0, y: 800, width: 595, height: 42, color: navy });
    this.page.drawText("DAYA CARES", { x: 40, y: 816, size: 14, font: this.bold, color: rgb(1, 1, 1) });
    this.page.drawText("Caring Beyond Emergencies  ·  Durgapur", {
      x: 320,
      y: 818,
      size: 9,
      font: this.font,
      color: rgb(1, 1, 1),
    });
    this.page.drawText(title, { x: 40, y: this.y, size: 16, font: this.bold, color: navy });
    this.y -= 18;
    this.page.drawText("Prefilled from Daya Cares records. Blank fields were not in MySQL.", {
      x: 40,
      y: this.y,
      size: 9,
      font: this.font,
      color: muted,
    });
    this.y -= 22;
  }

  section(title: string) {
    this.ensure(28);
    this.page.drawText(title, { x: 40, y: this.y, size: 12, font: this.bold, color: navy });
    this.y -= 16;
  }

  field(label: string, value?: string | number | null) {
    for (const line of wrap(`${label}: ${dash(value)}`)) {
      this.ensure();
      this.page.drawText(line, { x: 40, y: this.y, size: 10, font: this.font, color: ink });
      this.y -= 14;
    }
  }

  note(text: string) {
    for (const line of wrap(text, 92)) {
      this.ensure();
      this.page.drawText(line, { x: 40, y: this.y, size: 10, font: this.font, color: ink });
      this.y -= 14;
    }
  }

  async bytes() {
    this.page.drawText("DAYA CARES  ·  An initiative of Durgapur Adda Young Association", {
      x: 40,
      y: 36,
      size: 8,
      font: this.font,
      color: muted,
    });
    return this.doc.save();
  }
}

function vitalsLine(source: FormSource) {
  const v = source.visit?.log.vitals_payload;
  if (!v) return "Not recorded";
  const bits = [
    v.systolic_bp != null && v.diastolic_bp != null ? `BP ${v.systolic_bp}/${v.diastolic_bp}` : undefined,
    v.pulse_bpm != null ? `Pulse ${v.pulse_bpm}` : undefined,
    v.spo2_percent != null ? `SpO₂ ${v.spo2_percent}%` : undefined,
    v.temperature_f != null ? `Temp ${v.temperature_f}°F` : undefined,
    v.blood_sugar_mgdl != null ? `Sugar ${v.blood_sugar_mgdl}` : undefined,
  ].filter(Boolean);
  return bits.join("  ·  ") || "Not recorded";
}

async function registrationPdf(source: FormSource) {
  const doc = await new FormDoc().init();
  const reg = source.registration;
  doc.header("Care Recipient Registration Form");
  doc.section("Office use");
  doc.field("Care Recipient ID", source.customer?.customer_id);
  doc.field("Membership plan", source.customer?.plan ?? reg?.office.plan);
  doc.field("Recipient type", source.care_recipient_type ?? reg?.office.recipient_type);
  doc.field("Registration date", reg?.office.registration_date);
  doc.field("Service commences", reg?.office.service_commences_on);
  doc.field("Monthly fee", reg?.office.monthly_fee);
  doc.field("Payment mode", reg?.office.payment_mode);
  doc.section("Section A — Care Recipient");
  doc.field("Full name", source.customer?.name ?? reg?.recipient.full_name);
  doc.field("Date of birth", source.date_of_birth ?? reg?.recipient.date_of_birth);
  doc.field("Gender", source.gender ?? reg?.recipient.gender);
  doc.field("Blood group", reg?.recipient.blood_group ?? source.medical_history.blood_group);
  doc.field("Mobile", source.user?.phone_number ?? reg?.recipient.mobile);
  doc.field("Email", source.user?.email ?? reg?.recipient.email);
  doc.field("Address", source.customer?.address ?? reg?.recipient.address);
  doc.field("Landmark", source.landmark ?? reg?.recipient.landmark);
  doc.field("Login username", source.user?.username);
  doc.section("Sections B–C — Emergency contacts");
  const contacts = source.emergency_contacts.length
    ? source.emergency_contacts
    : [reg?.emergency.primary, reg?.emergency.secondary].filter(Boolean);
  if (!contacts.length) doc.note("No emergency contacts on file.");
  for (const contact of contacts) {
    if (!contact) continue;
    doc.field(
      contact.relationship || "Contact",
      `${contact.name}  ·  ${"phone" in contact ? contact.phone : ""}`.trim(),
    );
  }
  doc.section("Section D — Medical history");
  doc.field("Conditions", (source.medical_history.preexisting_conditions ?? reg?.medical.conditions ?? []).join(", "));
  doc.field("Notes", typeof source.medical_history.notes === "string" ? source.medical_history.notes : reg?.medical.other_conditions);
  doc.field("Physician", source.medical_history.primary_physician ?? reg?.healthcare.primary_doctor);
  doc.section("Section F — Family updates");
  if (!source.family.length) doc.note("No family login linked.");
  for (const member of source.family) {
    doc.field(member.relationship || "Family", `${member.name}  ·  ${member.phone}  ·  ${member.email ?? ""}`);
  }
  doc.field("Assigned Care Giver", source.worker_name);
  doc.field("Prepared by", source.generated_for);
  return doc.bytes();
}

async function assessmentPdf(source: FormSource) {
  const doc = await new FormDoc().init();
  doc.header("Care Recipient Home Assessment Form");
  doc.section("Care Recipient");
  doc.field("Name", source.customer?.name);
  doc.field("Care Recipient ID", source.customer?.customer_id);
  doc.field("Address", source.customer?.address);
  doc.field("Landmark", source.landmark);
  doc.field("Plan", source.customer?.plan);
  doc.section("1 — Home & living arrangement");
  doc.note("Living arrangement checkboxes are completed on the paper visit. Known contacts:");
  const checker = source.emergency_contacts[0] ?? source.family[0];
  doc.field("Person who normally checks on the member", checker ? `${checker.name} (${checker.relationship})` : undefined);
  doc.field("Contact", checker && "phone" in checker ? checker.phone : undefined);
  doc.section("2–3 — Access");
  doc.field("Address for emergency vehicle", source.customer?.address);
  doc.note("Stairs, lift, and entrance details are not stored in MySQL yet.");
  doc.section("Emergency contacts on file");
  for (const contact of source.emergency_contacts) {
    doc.field(contact.relationship || "Contact", `${contact.name}  ·  ${contact.phone}`);
  }
  if (source.visit) {
    doc.section("Latest visit observations");
    doc.field("Date", source.visit.log.visit_timestamp.slice(0, 10));
    doc.field("Vitals", vitalsLine(source));
    doc.field("Mobility", source.visit.log.qualitative_observations.physical_mobility);
    doc.field("Worker notes", source.visit.log.qualitative_observations.worker_notes);
  }
  doc.field("Prepared by", source.generated_for);
  return doc.bytes();
}

async function homeVisitPdf(source: FormSource) {
  const doc = await new FormDoc().init();
  const visit = source.visit;
  const obs = visit?.log.qualitative_observations;
  doc.header("Schedule Home Visit & Care Monitoring Form");
  doc.section("Section 1 — Visit identification");
  doc.field("Care Recipient name", source.customer?.name);
  doc.field("Care Recipient no.", source.customer?.customer_id);
  doc.field("Plan", source.customer?.plan);
  doc.field("Date of visit", visit?.log.visit_timestamp.slice(0, 10));
  doc.field("Time", visit?.log.visit_timestamp.slice(11, 16));
  doc.field("Care Executive / Care Giver", visit?.worker_name ?? source.worker_name);
  doc.field("Address", source.customer?.address ?? visit?.address);
  doc.section("Section 2 — General well-being");
  doc.field("Mood (1–5)", obs?.mood_rating);
  doc.field("Dietary compliance", obs?.dietary_compliance);
  doc.field("Physical mobility", obs?.physical_mobility);
  doc.field("Care Recipient concerns / notes", obs?.worker_notes);
  doc.section("Section 4 — Basic health observation");
  const v = visit?.log.vitals_payload;
  doc.field("Blood pressure", v?.systolic_bp != null ? `${v.systolic_bp} / ${v.diastolic_bp} mmHg` : undefined);
  doc.field("Pulse", v?.pulse_bpm != null ? `${v.pulse_bpm} / min` : undefined);
  doc.field("SpO₂", v?.spo2_percent != null ? `${v.spo2_percent} %` : undefined);
  doc.field("Temperature", v?.temperature_f != null ? `${v.temperature_f} °F` : undefined);
  doc.field("Random blood glucose", v?.blood_sugar_mgdl != null ? `${v.blood_sugar_mgdl} mg/dL` : undefined);
  doc.field("Follow-up needed", obs?.action_items_needed ? "Yes" : "No");
  if (!visit) doc.note("No visit log selected. Open a visit in Reports, or submit a home visit first.");
  doc.field("Prepared by", source.generated_for);
  return doc.bytes();
}

async function shiftLogPdf(source: FormSource) {
  const doc = await new FormDoc().init();
  const today = new Date().toISOString().slice(0, 10);
  doc.header("Shift Log Record");
  doc.section("Shift identification");
  doc.field("Date", today);
  doc.field("Name of Care Executive", source.generated_for);
  doc.field("Overall shift status", source.sos_open.length ? "Incidents open" : "Normal");
  doc.section("1 — Shift activity summary");
  doc.field("Home visits today", String(source.visits_today.length));
  doc.field("Open SOS / emergencies", String(source.sos_open.length));
  doc.section("3 — Home / hospital visits");
  if (!source.visits_today.length) doc.note("No home visits logged today.");
  for (const visit of source.visits_today) {
    doc.field(
      visit.log.visit_timestamp.slice(11, 16) || visit.log.visit_timestamp.slice(0, 10),
      `${visit.customer_name}  ·  ${visit.worker_name}`,
    );
  }
  doc.section("6 — Complaints / special concerns");
  if (!source.sos_open.length) doc.note("None recorded as open SOS.");
  for (const incident of source.sos_open.slice(0, 8)) {
    doc.field(incident.severity, `${incident.customer_name ?? "Unspecified"}  ·  ${incident.status}  ·  ${incident.notes ?? ""}`);
  }
  doc.field("Prepared by", source.generated_for);
  return doc.bytes();
}

export async function buildFilledForm(kind: ReportFormKind, source: FormSource) {
  if (kind === "registration") return registrationPdf(source);
  if (kind === "home-assessment") return assessmentPdf(source);
  if (kind === "home-visit") return homeVisitPdf(source);
  return shiftLogPdf(source);
}

export function filledFilename(kind: ReportFormKind, source: FormSource) {
  const who = source.customer?.name?.replace(/\s+/g, "-") ?? "daya";
  return `${kind}-${who}.pdf`;
}

export function readBlankForm(kind: ReportFormKind) {
  const path = blankFormPath(kind);
  if (!path) return undefined;
  return { bytes: readFileSync(path), filename: REPORT_FORMS.find((item) => item.id === kind)?.paper_file ?? `${kind}.pdf` };
}
