import type { AlertSeverity, QualitativeObservations, VitalsPayload } from "./types";

export interface DerivedVisitAlert {
  severity: AlertSeverity;
  flags: string[];
}

export function deriveVisitAlert(
  vitals: VitalsPayload,
  observations: QualitativeObservations,
): DerivedVisitAlert {
  const flags: string[] = [];
  let severity: AlertSeverity = "INFO";

  const raise = (next: AlertSeverity, flag: string) => {
    flags.push(flag);
    if (next === "CRITICAL" || (next === "WARNING" && severity === "INFO")) {
      severity = next;
    }
  };

  if ((vitals.systolic_bp ?? 0) >= 180 || (vitals.diastolic_bp ?? 0) >= 120) {
    raise("CRITICAL", "HYPERTENSIVE_EMERGENCY");
  }
  if ((vitals.spo2_percent ?? 100) < 90) {
    raise("CRITICAL", "SEVERE_HYPOXIA");
  } else if ((vitals.spo2_percent ?? 100) < 92) {
    raise("WARNING", "LOW_SPO2");
  }
  if ((vitals.pulse_bpm ?? 70) < 40 || (vitals.pulse_bpm ?? 70) > 140) {
    raise("CRITICAL", "UNSTABLE_PULSE");
  }
  if ((vitals.blood_sugar_mgdl ?? 120) < 54 || (vitals.blood_sugar_mgdl ?? 120) > 400) {
    raise("CRITICAL", "CRITICAL_GLUCOSE");
  }
  if ((vitals.temperature_f ?? 98) >= 103) {
    raise("CRITICAL", "HIGH_FEVER");
  }
  if (observations.action_items_needed) {
    raise("WARNING", "WORKER_REQUESTED_FOLLOW_UP");
  }
  if (observations.mood_rating && observations.mood_rating <= 2) {
    raise("WARNING", "LOW_MOOD");
  }
  const monitoring = observations.monitoring;
  if (monitoring?.immediate_concern === "YES") {
    raise("CRITICAL", "IMMEDIATE_CONCERN_ON_VISIT");
  }
  if (monitoring?.overall_status === "URGENT") {
    raise("CRITICAL", "URGENT_VISIT_ASSESSMENT");
  } else if (monitoring?.overall_status === "ATTENTION") {
    raise("WARNING", "ATTENTION_REQUIRED");
  }
  if (monitoring?.fall_since_last === "YES") {
    raise("WARNING", "FALL_SINCE_LAST_VISIT");
  }

  return { severity, flags };
}

export function buildFamilyVisitMessage(input: {
  customerName: string;
  workerName: string;
  vitals: VitalsPayload;
  severity: AlertSeverity;
}): string {
  const bp =
    input.vitals.systolic_bp && input.vitals.diastolic_bp
      ? `BP ${input.vitals.systolic_bp}/${input.vitals.diastolic_bp}`
      : "BP not recorded";
  const spo2 = input.vitals.spo2_percent != null ? `SpO₂ ${input.vitals.spo2_percent}%` : "SpO₂ n/a";
  const pulse = input.vitals.pulse_bpm != null ? `Pulse ${input.vitals.pulse_bpm}` : "Pulse n/a";

  const prefix =
    input.severity === "CRITICAL"
      ? "DAYA CARES urgent visit alert"
      : "DAYA CARES visit update";

  return `${prefix}: ${input.customerName}'s home visit was recorded by ${input.workerName}. ${bp}, ${spo2}, ${pulse}. Open the Daya app for the full log.`;
}
