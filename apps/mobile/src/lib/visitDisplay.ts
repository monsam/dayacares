import type { HomeVisitSummary, QualitativeObservations, VitalsPayload } from "@daya/shared";
import { deriveVisitAlert, monitoringRows } from "@daya/shared";

export function formatVitalsLine(vitals: VitalsPayload) {
  const parts = [
    vitals.systolic_bp != null && vitals.diastolic_bp != null
      ? `BP ${vitals.systolic_bp}/${vitals.diastolic_bp}`
      : undefined,
    vitals.spo2_percent != null ? `SpO₂ ${vitals.spo2_percent}%` : undefined,
    vitals.pulse_bpm != null ? `Pulse ${vitals.pulse_bpm}` : undefined,
  ].filter(Boolean);
  return parts.join(" · ") || "Visit recorded";
}

export function formatVisitWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function visitAlert(visit: HomeVisitSummary) {
  return deriveVisitAlert(visit.log.vitals_payload, visit.log.qualitative_observations);
}

export function vitalRows(vitals: VitalsPayload) {
  const rows: { label: string; value: string }[] = [];
  if (vitals.systolic_bp != null && vitals.diastolic_bp != null) {
    rows.push({ label: "Blood pressure", value: `${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg` });
  }
  if (vitals.pulse_bpm != null) {
    rows.push({ label: "Pulse", value: `${vitals.pulse_bpm} bpm` });
  }
  if (vitals.spo2_percent != null) {
    rows.push({ label: "SpO₂", value: `${vitals.spo2_percent}%` });
  }
  if (vitals.blood_sugar_mgdl != null) {
    const kind = vitals.sugar_test_type ? ` · ${vitals.sugar_test_type.replaceAll("_", " ")}` : "";
    rows.push({ label: "Blood sugar", value: `${vitals.blood_sugar_mgdl} mg/dL${kind}` });
  }
  if (vitals.temperature_f != null) {
    rows.push({ label: "Temperature", value: `${vitals.temperature_f} °F` });
  }
  if (vitals.weight_kg != null) {
    rows.push({ label: "Weight", value: `${vitals.weight_kg} kg` });
  }
  return rows;
}

export function observationRows(observations: QualitativeObservations) {
  const rows: { label: string; value: string }[] = [];
  if (observations.mood_rating != null) {
    rows.push({ label: "Mood", value: `${observations.mood_rating} / 5` });
  }
  if (observations.dietary_compliance) {
    rows.push({ label: "Diet", value: observations.dietary_compliance.replaceAll("_", " ") });
  }
  if (observations.physical_mobility) {
    rows.push({ label: "Mobility", value: observations.physical_mobility.replaceAll("_", " ") });
  }
  if (observations.action_items_needed) {
    rows.push({ label: "Follow-up", value: "Care Giver requested follow-up" });
  }
  if (observations.worker_notes) {
    rows.push({ label: "Notes", value: observations.worker_notes });
  }
  for (const row of monitoringRows(observations.monitoring)) {
    rows.push({ label: `${row.section} · ${row.label}`, value: row.value });
  }
  return rows;
}
