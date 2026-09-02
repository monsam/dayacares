import type { VitalsPayload } from "./types";

export interface FieldError {
  field: keyof VitalsPayload;
  message: string;
}

export interface FieldWarning {
  field: keyof VitalsPayload;
  message: string;
}

export interface VitalsValidationResult {
  ok: boolean;
  errors: FieldError[];
  warnings: FieldWarning[];
}

const REQUIRED_VITALS: Array<keyof VitalsPayload> = [
  "systolic_bp",
  "diastolic_bp",
  "pulse_bpm",
  "spo2_percent",
];

function isPresent(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function rangeError(
  field: keyof VitalsPayload,
  value: number | undefined,
  min: number,
  max: number,
  label: string,
  extra?: string,
): FieldError | undefined {
  if (!isPresent(value)) return undefined;
  if (value < min || value > max) {
    return {
      field,
      message: extra ?? `${label} must be between ${min} and ${max}.`,
    };
  }
  return undefined;
}

export function validateVitalsPayload(
  vitals: VitalsPayload,
  options: { requireCoreVitals?: boolean } = {},
): VitalsValidationResult {
  const errors: FieldError[] = [];
  const warnings: FieldWarning[] = [];
  const requireCore = options.requireCoreVitals ?? true;

  if (requireCore) {
    for (const field of REQUIRED_VITALS) {
      if (!isPresent(vitals[field] as number | undefined)) {
        errors.push({ field, message: `${field} is required.` });
      }
    }
  }

  if (isPresent(vitals.systolic_bp) && vitals.systolic_bp > 250) {
    errors.push({
      field: "systolic_bp",
      message: "Systolic BP cannot exceed 250 mmHg. Recheck the reading.",
    });
  }

  const rangeChecks: Array<FieldError | undefined> = [
    rangeError("systolic_bp", vitals.systolic_bp, 60, 250, "Systolic BP"),
    rangeError("diastolic_bp", vitals.diastolic_bp, 30, 160, "Diastolic BP"),
    rangeError("pulse_bpm", vitals.pulse_bpm, 30, 220, "Pulse"),
    rangeError("spo2_percent", vitals.spo2_percent, 50, 100, "SpO₂"),
    rangeError("blood_sugar_mgdl", vitals.blood_sugar_mgdl, 20, 600, "Blood sugar"),
    rangeError("temperature_f", vitals.temperature_f, 93, 108, "Temperature"),
    rangeError("weight_kg", vitals.weight_kg, 20, 250, "Weight"),
  ];

  for (const error of rangeChecks) {
    if (error && !errors.some((existing) => existing.field === error.field && existing.message === error.message)) {
      errors.push(error);
    }
  }

  if (
    isPresent(vitals.systolic_bp) &&
    isPresent(vitals.diastolic_bp) &&
    vitals.systolic_bp <= vitals.diastolic_bp
  ) {
    errors.push({
      field: "systolic_bp",
      message: "Systolic BP must be higher than diastolic BP.",
    });
  }

  if (isPresent(vitals.blood_sugar_mgdl) && !vitals.sugar_test_type) {
    errors.push({
      field: "sugar_test_type",
      message: "Select a sugar test type when recording blood sugar.",
    });
  }

  if (isPresent(vitals.systolic_bp) && vitals.systolic_bp >= 180) {
    warnings.push({
      field: "systolic_bp",
      message: "Systolic BP ≥ 180 mmHg. Treat as a hypertensive emergency flag.",
    });
  } else if (isPresent(vitals.systolic_bp) && vitals.systolic_bp >= 140) {
    warnings.push({
      field: "systolic_bp",
      message: "Systolic BP is above the typical senior threshold (140 mmHg).",
    });
  }

  if (isPresent(vitals.diastolic_bp) && vitals.diastolic_bp >= 120) {
    warnings.push({
      field: "diastolic_bp",
      message: "Diastolic BP ≥ 120 mmHg. Treat as a hypertensive emergency flag.",
    });
  }

  if (isPresent(vitals.spo2_percent) && vitals.spo2_percent < 92) {
    warnings.push({
      field: "spo2_percent",
      message: "SpO₂ below 92% requires immediate clinical attention.",
    });
  }

  if (isPresent(vitals.pulse_bpm) && (vitals.pulse_bpm < 50 || vitals.pulse_bpm > 120)) {
    warnings.push({
      field: "pulse_bpm",
      message: "Pulse is outside the expected resting range for this visit.",
    });
  }

  if (isPresent(vitals.blood_sugar_mgdl) && vitals.blood_sugar_mgdl < 70) {
    warnings.push({
      field: "blood_sugar_mgdl",
      message: "Blood sugar is in the hypoglycaemia range.",
    });
  } else if (isPresent(vitals.blood_sugar_mgdl) && vitals.blood_sugar_mgdl > 250) {
    warnings.push({
      field: "blood_sugar_mgdl",
      message: "Blood sugar is markedly elevated.",
    });
  }

  if (isPresent(vitals.temperature_f) && vitals.temperature_f >= 100.4) {
    warnings.push({
      field: "temperature_f",
      message: "Fever detected (≥ 100.4°F).",
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}
