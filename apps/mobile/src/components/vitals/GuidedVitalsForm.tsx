import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  type CreateHealthVisitLogRequest,
  type CreateHealthVisitLogResponse,
  type DietaryCompliance,
  type MoodRating,
  type PhysicalMobility,
  type QualitativeObservations,
  type SugarTestType,
  type VitalsPayload,
  validateVitalsPayload,
} from "@daya/shared";
import { detectEntrySource } from "../../api/client";
import { createId } from "../../lib/id";
import { apiErrorMessage } from "../../lib/scheduleDisplay";
import { createHealthVisitLog } from "../../api/visits";
import {
  clearVisitDraft,
  enqueueVisit,
  flushVisitQueue,
  loadVisitDraft,
  saveVisitDraft,
  subscribeToReconnect,
} from "../../offline/visitQueue";
import { useTheme } from "../../theme/ThemeContext";
import { space, type } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { TextField } from "../../ui/TextField";

const STEPS = [
  "Confirm Care Focus",
  "Blood pressure",
  "Pulse & oxygen",
  "Blood sugar",
  "Temperature & weight",
  "Well-being",
  "Notes & photo",
  "Review & submit",
] as const;

const MOBILITY: PhysicalMobility[] = [
  "INDEPENDENT",
  "WALKING_STICK",
  "WALKER",
  "WHEELCHAIR",
  "ASSISTED",
  "OTHER",
];

const DIET: DietaryCompliance[] = ["GOOD", "PARTIAL", "POOR", "UNKNOWN"];
const SUGAR: SugarTestType[] = ["FASTING", "POST_PRANDIAL", "RANDOM"];

function toNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface GuidedVitalsFormProps {
  customerId: string;
  customerName: string;
  address: string;
  workerName: string;
}

export function GuidedVitalsForm({
  customerId,
  customerName,
  address,
  workerName,
}: GuidedVitalsFormProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [offlineNotice, setOfflineNotice] = useState<string>();
  const [submitted, setSubmitted] = useState<CreateHealthVisitLogResponse | "queued">();
  const [submitError, setSubmitError] = useState<string>();
  const [photoUri, setPhotoUri] = useState<string>();
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState<QualitativeObservations>({
    dietary_compliance: "UNKNOWN",
    physical_mobility: "INDEPENDENT",
    action_items_needed: false,
  });

  const payload = useMemo<CreateHealthVisitLogRequest>(
    () => ({
      log_id: vitals.log_id,
      customer_id: customerId,
      entry_source: detectEntrySource(),
      vitals_payload: {
        systolic_bp: toNumber(vitals.systolic_bp ?? ""),
        diastolic_bp: toNumber(vitals.diastolic_bp ?? ""),
        pulse_bpm: toNumber(vitals.pulse_bpm ?? ""),
        spo2_percent: toNumber(vitals.spo2_percent ?? ""),
        blood_sugar_mgdl: toNumber(vitals.blood_sugar_mgdl ?? ""),
        sugar_test_type: (vitals.sugar_test_type as SugarTestType | undefined) || undefined,
        temperature_f: toNumber(vitals.temperature_f ?? ""),
        weight_kg: toNumber(vitals.weight_kg ?? ""),
      },
      qualitative_observations: observations,
      visit_photo_s3_url: photoUri,
    }),
    [customerId, observations, photoUri, vitals],
  );

  const validation = validateVitalsPayload(payload.vitals_payload, {
    requireCoreVitals: step >= 4,
  });

  useEffect(() => {
    loadVisitDraft(customerId).then((draft) => {
      if (!draft) {
        setVitals((current) => ({ ...current, log_id: current.log_id ?? createId() }));
        return;
      }
      setVitals({
        log_id: draft.log_id ?? createId(),
        systolic_bp: String(draft.vitals_payload.systolic_bp ?? ""),
        diastolic_bp: String(draft.vitals_payload.diastolic_bp ?? ""),
        pulse_bpm: String(draft.vitals_payload.pulse_bpm ?? ""),
        spo2_percent: String(draft.vitals_payload.spo2_percent ?? ""),
        blood_sugar_mgdl: String(draft.vitals_payload.blood_sugar_mgdl ?? ""),
        sugar_test_type: draft.vitals_payload.sugar_test_type ?? "",
        temperature_f: String(draft.vitals_payload.temperature_f ?? ""),
        weight_kg: String(draft.vitals_payload.weight_kg ?? ""),
      });
      setObservations(draft.qualitative_observations ?? {});
      setPhotoUri(draft.visit_photo_s3_url);
    });
  }, [customerId]);

  useEffect(() => {
    if (payload.log_id) {
      saveVisitDraft(customerId, payload);
    }
  }, [customerId, payload]);

  useEffect(() => {
    return subscribeToReconnect(() => {
      flushVisitQueue().then((result) => {
        if (result.synced) {
          setOfflineNotice(`${result.synced} queued visit(s) synced.`);
        }
      });
    });
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!validation.ok) {
        throw new Error(validation.errors.map((error) => error.message).join("\n"));
      }
      try {
        return await createHealthVisitLog(payload);
      } catch (error) {
        const status =
          error && typeof error === "object" && "response" in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;
        if (status && status < 500) {
          throw error;
        }
        await enqueueVisit(payload);
        return "queued" as const;
      }
    },
    onSuccess: async (result) => {
      setSubmitError(undefined);
      await clearVisitDraft(customerId);
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      if (result === "queued") {
        setOfflineNotice("Saved on this device. Daya will sync when the network returns.");
        setSubmitted("queued");
        return;
      }
      setSubmitted(result);
    },
    onError: (error) => {
      setSubmitError(apiErrorMessage(error, "Could not save this visit log."));
    },
  });

  const setVital = (field: keyof VitalsPayload | "log_id", value: string) => {
    setVitals((current) => ({ ...current, [field]: value }));
  };

  const fieldError = (field: keyof VitalsPayload) =>
    validation.errors.find((error) => error.field === field)?.message;
  const fieldWarning = (field: keyof VitalsPayload) =>
    validation.warnings.find((warning) => warning.field === field)?.message;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setPhotoUri(result.assets[0]?.uri);
    }
  };

  const next = () => setStep((current) => Math.min(current + 1, STEPS.length - 1));
  const back = () => setStep((current) => Math.max(current - 1, 0));

  if (submitted) {
    const queued = submitted === "queued";
    const flags = !queued ? submitted.alert.flags : [];
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.kicker, { color: colors.blue }]}>Care Giver · Visit saved</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          {queued ? "Visit saved on this device" : "Visit recorded"}
        </Text>
        <Card style={styles.gap}>
          <Text style={[styles.section, { color: colors.ink }]}>{customerName}</Text>
          <Text style={[styles.copy, { color: colors.ink }]}>
            BP {payload.vitals_payload.systolic_bp}/{payload.vitals_payload.diastolic_bp} · Pulse{" "}
            {payload.vitals_payload.pulse_bpm} · SpO₂ {payload.vitals_payload.spo2_percent}%
          </Text>
          <Text style={[styles.copy, { color: colors.inkMuted }]}>
            {queued
              ? "This log will sync when the network returns."
              : flags.length
                ? flags.join(" ")
                : "No clinical flags."}
          </Text>
        </Card>
        <View style={styles.actions}>
          <Button label="Home" onPress={() => router.replace("/home")} pressOnDown />
          {!queued && submitted.log.log_id ? (
            <Button
              label="View visit"
              variant="secondary"
              onPress={() => router.push(`/visits/${submitted.log.log_id}`)}
              pressOnDown
            />
          ) : null}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={[styles.kicker, { color: colors.blue }]}>Care Giver · Enter Care Focus data</Text>
      <Text style={[styles.title, { color: colors.ink }]}>{STEPS[step]}</Text>
      <Text style={[styles.progress, { color: colors.inkMuted }]}>
        Step {step + 1} of {STEPS.length}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.line }]}>
        <View
          style={[
            styles.trackFill,
            { width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: colors.blue },
          ]}
        />
      </View>

      {offlineNotice ? (
        <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warning }}>
          <Text style={{ color: colors.warning, fontSize: type.body }}>{offlineNotice}</Text>
        </Card>
      ) : null}

      {step === 0 ? (
        <Card>
          <Text style={[styles.section, { color: colors.ink }]}>{customerName}</Text>
          <Text style={[styles.copy, { color: colors.inkMuted }]}>{address}</Text>
          <Text style={[styles.copy, { color: colors.ink }]}>Visit by {workerName}</Text>
          <Text style={[styles.copy, { color: colors.inkMuted }]}>
            Confirm identity, address, and that this is an active assigned visit before recording vitals.
          </Text>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card style={styles.gap}>
          <TextField
            label="Systolic BP (mmHg)"
            value={vitals.systolic_bp ?? ""}
            onChangeText={(value) => setVital("systolic_bp", value)}
            keyboardType="numeric"
            error={fieldError("systolic_bp")}
            helper={fieldWarning("systolic_bp") ?? "Values above 250 are rejected."}
          />
          <TextField
            label="Diastolic BP (mmHg)"
            value={vitals.diastolic_bp ?? ""}
            onChangeText={(value) => setVital("diastolic_bp", value)}
            keyboardType="numeric"
            error={fieldError("diastolic_bp")}
            helper={fieldWarning("diastolic_bp")}
          />
        </Card>
      ) : null}

      {step === 2 ? (
        <Card style={styles.gap}>
          <TextField
            label="Pulse (bpm)"
            value={vitals.pulse_bpm ?? ""}
            onChangeText={(value) => setVital("pulse_bpm", value)}
            keyboardType="numeric"
            error={fieldError("pulse_bpm")}
            helper={fieldWarning("pulse_bpm")}
          />
          <TextField
            label="SpO₂ (%)"
            value={vitals.spo2_percent ?? ""}
            onChangeText={(value) => setVital("spo2_percent", value)}
            keyboardType="numeric"
            error={fieldError("spo2_percent")}
            helper={fieldWarning("spo2_percent")}
          />
        </Card>
      ) : null}

      {step === 3 ? (
        <Card style={styles.gap}>
          <Text style={[styles.section, { color: colors.ink }]}>Sugar test type</Text>
          <View style={styles.chips}>
            {SUGAR.map((option) => (
              <Chip
                key={option}
                label={option.replace("_", " ")}
                selected={vitals.sugar_test_type === option}
                onPress={() => setVital("sugar_test_type", option)}
              />
            ))}
          </View>
          <TextField
            label="Blood sugar (mg/dL)"
            value={vitals.blood_sugar_mgdl ?? ""}
            onChangeText={(value) => setVital("blood_sugar_mgdl", value)}
            keyboardType="numeric"
            error={fieldError("blood_sugar_mgdl") ?? fieldError("sugar_test_type")}
            helper={fieldWarning("blood_sugar_mgdl")}
          />
        </Card>
      ) : null}

      {step === 4 ? (
        <Card style={styles.gap}>
          <TextField
            label="Temperature (°F)"
            value={vitals.temperature_f ?? ""}
            onChangeText={(value) => setVital("temperature_f", value)}
            keyboardType="decimal-pad"
            error={fieldError("temperature_f")}
            helper={fieldWarning("temperature_f")}
          />
          <TextField
            label="Weight (kg)"
            value={vitals.weight_kg ?? ""}
            onChangeText={(value) => setVital("weight_kg", value)}
            keyboardType="decimal-pad"
            error={fieldError("weight_kg")}
          />
        </Card>
      ) : null}

      {step === 5 ? (
        <Card style={styles.gap}>
          <Text style={[styles.section, { color: colors.ink }]}>Mood (1 low – 5 high)</Text>
          <View style={styles.chips}>
            {([1, 2, 3, 4, 5] as MoodRating[]).map((rating) => (
              <Chip
                key={rating}
                label={String(rating)}
                selected={observations.mood_rating === rating}
                onPress={() => setObservations((current) => ({ ...current, mood_rating: rating }))}
              />
            ))}
          </View>
          <Text style={[styles.section, { color: colors.ink }]}>Dietary compliance</Text>
          <View style={styles.chips}>
            {DIET.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={observations.dietary_compliance === option}
                onPress={() => setObservations((current) => ({ ...current, dietary_compliance: option }))}
              />
            ))}
          </View>
          <Text style={[styles.section, { color: colors.ink }]}>Physical mobility</Text>
          <View style={styles.chips}>
            {MOBILITY.map((option) => (
              <Chip
                key={option}
                label={option.replace("_", " ")}
                selected={observations.physical_mobility === option}
                onPress={() => setObservations((current) => ({ ...current, physical_mobility: option }))}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {step === 6 ? (
        <Card style={styles.gap}>
          <TextField
            label="Worker notes"
            value={observations.worker_notes ?? ""}
            onChangeText={(value) => setObservations((current) => ({ ...current, worker_notes: value }))}
          />
          <Chip
            label={observations.action_items_needed ? "Follow-up needed: Yes" : "Follow-up needed: No"}
            selected={Boolean(observations.action_items_needed)}
            onPress={() =>
              setObservations((current) => ({
                ...current,
                action_items_needed: !current.action_items_needed,
              }))
            }
          />
          <Button
            label={photoUri ? "Retake visit photo" : "Photograph prescription or report"}
            variant="secondary"
            onPress={pickPhoto}
          />
          {photoUri ? <Text style={[styles.copy, { color: colors.success }]}>Photo attached</Text> : null}
        </Card>
      ) : null}

      {step === 7 ? (
        <Card style={styles.gap}>
          <Text style={[styles.section, { color: colors.ink }]}>Review for {customerName}</Text>
          <Text style={[styles.copy, { color: colors.ink }]}>
            BP {payload.vitals_payload.systolic_bp}/{payload.vitals_payload.diastolic_bp} · Pulse{" "}
            {payload.vitals_payload.pulse_bpm} · SpO₂ {payload.vitals_payload.spo2_percent}%
          </Text>
          {!validation.ok
            ? validation.errors.map((error) => (
                <Text key={error.message} style={{ color: colors.danger, fontSize: type.body }}>
                  {error.message}
                </Text>
              ))
            : null}
          {validation.warnings.map((warning) => (
            <Text key={warning.message} style={{ color: colors.warning, fontSize: type.body }}>
              {warning.message}
            </Text>
          ))}
          {submitError ? (
            <Text style={{ color: colors.danger, fontSize: type.body }}>{submitError}</Text>
          ) : null}
        </Card>
      ) : null}

      <View style={styles.actions}>
        {step > 0 ? <Button label="Back" variant="secondary" onPress={back} /> : null}
        {step < STEPS.length - 1 ? (
          <Button label="Continue" onPress={next} />
        ) : (
          <Button
            label={mutation.isPending ? "Saving…" : "Submit visit log"}
            onPress={() => {
              setSubmitError(undefined);
              mutation.mutate();
            }}
            disabled={mutation.isPending || !validation.ok}
            pressOnDown
          />
        )}
      </View>
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.blue : colors.white,
          borderColor: colors.blue,
        },
      ]}
    >
      <Text style={{ color: selected ? colors.white : colors.blue, fontSize: 16, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  kicker: { fontSize: 16, fontWeight: "800" },
  title: { fontSize: type.title, fontWeight: "800" },
  progress: { fontSize: 16 },
  track: { height: 8, borderRadius: 99, overflow: "hidden" },
  trackFill: { height: 8 },
  section: { fontSize: 20, fontWeight: "800" },
  copy: { fontSize: type.body, lineHeight: 26 },
  gap: { gap: space.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actions: { gap: space.sm },
});
