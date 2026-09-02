import assert from "node:assert/strict";
import test from "node:test";
import { validateVitalsPayload } from "./vitals";

test("rejects systolic BP above 250", () => {
  const result = validateVitalsPayload({
    systolic_bp: 251,
    diastolic_bp: 80,
    pulse_bpm: 72,
    spo2_percent: 97,
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === "systolic_bp"));
});

test("accepts a complete in-range vitals payload", () => {
  const result = validateVitalsPayload({
    systolic_bp: 128,
    diastolic_bp: 78,
    pulse_bpm: 74,
    spo2_percent: 98,
    blood_sugar_mgdl: 112,
    sugar_test_type: "RANDOM",
    temperature_f: 98.4,
    weight_kg: 64,
  });

  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});
