import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ACK_ROLES,
  ADL_LEVELS,
  APPEARANCE_OPTIONS,
  APPETITE_OPTIONS,
  CONTACTS_VERIFIED,
  EXPRESSED_OPTIONS,
  FAMILY_COMM,
  FAMILY_MODE,
  FEEDBACK_OPTIONS,
  FLUID_OPTIONS,
  FOLLOWUP_WINDOWS,
  GENERAL_OBS,
  HYGIENE_OPTIONS,
  IMMEDIATE_ACTIONS,
  MEAL_OPTIONS,
  MED_ADHERENCE,
  MED_ACTIONS,
  MED_STOCK,
  MENTAL_ACTIONS,
  MENTAL_APPEAR,
  MOBILITY_CHANGE,
  MOBILITY_DIFFICULTY,
  MOBILITY_NOW,
  MONITORING_LEVEL,
  OVERALL_STATUS,
  PRESENT_OPTIONS,
  REQUEST_OPTIONS,
  SLEEP_OPTIONS,
  SOCIAL_OPTIONS,
  UPCOMING_OPTIONS,
  URGENT_ACTIONS,
  URGENT_FLAGS,
  VS_PREVIOUS_OPTIONS,
  mobilityFromPaper,
  needsFollowUp,
  type CreateHealthVisitLogRequest,
  type CreateHealthVisitLogResponse,
  type HomeVisitMonitoring,
  type QualitativeObservations,
  type SugarTestType,
  type VitalsPayload,
  validateVitalsPayload,
} from "@daya/shared";
import { detectEntrySource } from "../../api/client";
import { createHealthVisitLog, updateHealthVisitLog } from "../../api/visits";
import type { HomeVisitSummary } from "@daya/shared";
import { createId } from "../../lib/id";
import { apiErrorMessage } from "../../lib/scheduleDisplay";
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
  "1 · Visit identification",
  "2 · General well-being",
  "3 · Emergency screening",
  "4 · Vital signs",
  "4 · Health observation",
  "5 · Medication",
  "6 · Food, water & routine",
  "7 · Mobility & falls",
  "8 · Home safety",
  "9 · Hygiene & self-care",
  "10 · Mental well-being",
  "11–12 · Healthcare & family",
  "13–14 · Requests & actions",
  "15–16 · Assessment & feedback",
  "17 · Review & acknowledgement",
] as const;

const SUGAR: SugarTestType[] = ["FASTING", "POST_PRANDIAL", "RANDOM"];

function toNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toggle(list: string[] | undefined, value: string) {
  const current = list ?? [];
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export interface GuidedVitalsFormProps {
  customerId: string;
  customerName: string;
  address: string;
  workerName: string;
  plan?: string;
  existingLog?: HomeVisitSummary;
}

function vitalsFromLog(log: HomeVisitSummary["log"]): Record<string, string> {
  return {
    log_id: log.log_id,
    systolic_bp: String(log.vitals_payload.systolic_bp ?? ""),
    diastolic_bp: String(log.vitals_payload.diastolic_bp ?? ""),
    pulse_bpm: String(log.vitals_payload.pulse_bpm ?? ""),
    spo2_percent: String(log.vitals_payload.spo2_percent ?? ""),
    blood_sugar_mgdl: String(log.vitals_payload.blood_sugar_mgdl ?? ""),
    sugar_test_type: log.vitals_payload.sugar_test_type ?? "",
    temperature_f: String(log.vitals_payload.temperature_f ?? ""),
    weight_kg: String(log.vitals_payload.weight_kg ?? ""),
  };
}

export function GuidedVitalsForm({
  customerId,
  customerName,
  address,
  workerName,
  plan,
  existingLog,
}: GuidedVitalsFormProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [offlineNotice, setOfflineNotice] = useState<string>();
  const [submitted, setSubmitted] = useState<CreateHealthVisitLogResponse | "queued">();
  const [submitError, setSubmitError] = useState<string>();
  const [photoUri, setPhotoUri] = useState<string>();
  const [vitals, setVitals] = useState<Record<string, string>>(() =>
    existingLog ? vitalsFromLog(existingLog.log) : {},
  );
  const [observations, setObservations] = useState<QualitativeObservations>(
    existingLog?.log.qualitative_observations ?? {
      dietary_compliance: "UNKNOWN",
      physical_mobility: "INDEPENDENT",
      action_items_needed: false,
      monitoring: {},
    },
  );

  const mon = observations.monitoring ?? {};
  const setMon = (patch: Partial<HomeVisitMonitoring>) => {
    setObservations((current) => {
      const monitoring = { ...current.monitoring, ...patch };
      const next: QualitativeObservations = {
        ...current,
        monitoring,
        physical_mobility: mobilityFromPaper(monitoring.mobility_current) ?? current.physical_mobility,
        worker_notes: monitoring.visit_summary || monitoring.recipient_concerns || current.worker_notes,
      };
      next.action_items_needed = needsFollowUp(next);
      return next;
    });
  };

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
    requireCoreVitals: step >= 3,
  });

  useEffect(() => {
    if (existingLog) return;
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
      setObservations(draft.qualitative_observations ?? { monitoring: {} });
      setPhotoUri(draft.visit_photo_s3_url);
    });
  }, [customerId, existingLog]);

  useEffect(() => {
    if (existingLog || !payload.log_id) return;
    saveVisitDraft(customerId, payload);
  }, [customerId, existingLog, payload]);

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
        if (existingLog) {
          const visit = await updateHealthVisitLog(existingLog.log.log_id, {
            vitals_payload: payload.vitals_payload,
            qualitative_observations: payload.qualitative_observations,
            visit_photo_s3_url: payload.visit_photo_s3_url,
          });
          return {
            log: visit.log,
            alert: { severity: "INFO" as const, flags: [], notified_family_user_ids: [], channels: [] },
          };
        }
        return await createHealthVisitLog(payload);
      } catch (error) {
        const status =
          error && typeof error === "object" && "response" in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;
        if (existingLog || (status && status < 500)) {
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
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["visit"] });
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
            {mon.overall_status ? `Overall: ${mon.overall_status}. ` : ""}
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
      <Text style={[styles.kicker, { color: colors.blue }]}>Home visit & care monitoring</Text>
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
        <Card style={styles.gap}>
          <Text style={[styles.section, { color: colors.ink }]}>{customerName}</Text>
          <Text style={[styles.copy, { color: colors.inkMuted }]}>{address}</Text>
          <Text style={[styles.copy, { color: colors.ink }]}>
            {plan ? `${plan} plan · ` : ""}Visit by {workerName}
          </Text>
          <ChoiceGroup
            label="Who was present during the visit?"
            options={PRESENT_OPTIONS}
            value={mon.present}
            multi
            onSelect={(option) => setMon({ present: toggle(mon.present, option) })}
          />
          {mon.present?.includes("Other") ? (
            <TextField label="Other present" value={mon.present_other ?? ""} onChangeText={(present_other) => setMon({ present_other })} />
          ) : null}
          <TextField label="Name & relationship" value={mon.present_name ?? ""} onChangeText={(present_name) => setMon({ present_name })} />
          <TextField label="Time of arrival" value={mon.arrival_time ?? ""} onChangeText={(arrival_time) => setMon({ arrival_time })} placeholder="e.g. 10:05 AM" />
          <TextField label="Time of departure" value={mon.departure_time ?? ""} onChangeText={(departure_time) => setMon({ departure_time })} placeholder="e.g. 10:50 AM" />
        </Card>
      ) : null}

      {step === 1 ? (
        <Card style={styles.gap}>
          <ChoiceGroup
            label="How does the Care Recipient appear today?"
            options={APPEARANCE_OPTIONS}
            value={mon.appearance}
            onSelect={(appearance) => setMon({ appearance })}
          />
          <ChoiceGroup
            label="Compared with the previous visit"
            options={VS_PREVIOUS_OPTIONS}
            value={mon.vs_previous}
            onSelect={(vs_previous) => setMon({ vs_previous })}
          />
          <TextField label="What has changed?" value={mon.what_changed ?? ""} onChangeText={(what_changed) => setMon({ what_changed })} />
          <TextField
            label="Care Recipient's own concerns today"
            value={mon.recipient_concerns ?? ""}
            onChangeText={(recipient_concerns) => setMon({ recipient_concerns })}
          />
        </Card>
      ) : null}

      {step === 2 ? (
        <Card style={styles.gap}>
          <ChoiceGroup
            label="Any immediate concern requiring urgent action?"
            options={["NO", "YES"]}
            value={mon.immediate_concern}
            onSelect={(value) => setMon({ immediate_concern: value as "NO" | "YES" })}
          />
          {mon.immediate_concern === "YES" ? (
            <>
              <ChoiceGroup
                label="Tick as applicable"
                options={URGENT_FLAGS}
                value={mon.urgent_flags}
                multi
                onSelect={(option) => setMon({ urgent_flags: toggle(mon.urgent_flags, option) })}
              />
              <TextField label="Other urgent detail" value={mon.urgent_other ?? ""} onChangeText={(urgent_other) => setMon({ urgent_other })} />
              <ChoiceGroup
                label="Action taken"
                options={URGENT_ACTIONS}
                value={mon.urgent_actions}
                multi
                onSelect={(option) => setMon({ urgent_actions: toggle(mon.urgent_actions, option) })}
              />
              <TextField label="Time of escalation" value={mon.escalation_time ?? ""} onChangeText={(escalation_time) => setMon({ escalation_time })} />
            </>
          ) : null}
        </Card>
      ) : null}

      {step === 3 ? (
        <Card style={styles.gap}>
          <Text style={[styles.copy, { color: colors.inkMuted }]}>
            Record vitals only where you have the equipment. Escalate abnormal readings per DAYA protocol.
          </Text>
          <TextField
            label="Systolic BP (mmHg)"
            value={vitals.systolic_bp ?? ""}
            onChangeText={(value) => setVital("systolic_bp", value)}
            keyboardType="numeric"
            error={fieldError("systolic_bp")}
            helper={fieldWarning("systolic_bp")}
          />
          <TextField
            label="Diastolic BP (mmHg)"
            value={vitals.diastolic_bp ?? ""}
            onChangeText={(value) => setVital("diastolic_bp", value)}
            keyboardType="numeric"
            error={fieldError("diastolic_bp")}
            helper={fieldWarning("diastolic_bp")}
          />
          <TextField
            label="Pulse (/min)"
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
          <Text style={[styles.section, { color: colors.ink }]}>Blood glucose</Text>
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
            label="Blood glucose (mg/dL)"
            value={vitals.blood_sugar_mgdl ?? ""}
            onChangeText={(value) => setVital("blood_sugar_mgdl", value)}
            keyboardType="numeric"
            error={fieldError("blood_sugar_mgdl") ?? fieldError("sugar_test_type")}
            helper={fieldWarning("blood_sugar_mgdl")}
          />
          <TextField
            label="Temperature (°F)"
            value={vitals.temperature_f ?? ""}
            onChangeText={(value) => setVital("temperature_f", value)}
            keyboardType="decimal-pad"
            error={fieldError("temperature_f")}
            helper={fieldWarning("temperature_f")}
          />
        </Card>
      ) : null}

      {step === 4 ? (
        <Card style={styles.gap}>
          <TextField
            label="Any unusual observation"
            value={mon.unusual_observation ?? ""}
            onChangeText={(unusual_observation) => setMon({ unusual_observation })}
          />
          <ChoiceGroup
            label="General observation"
            options={GENERAL_OBS}
            value={mon.general_observation}
            multi
            onSelect={(option) => setMon({ general_observation: toggle(mon.general_observation, option) })}
          />
          {mon.general_observation?.includes("Other") ? (
            <TextField label="Other observation" value={mon.general_other ?? ""} onChangeText={(general_other) => setMon({ general_other })} />
          ) : null}
        </Card>
      ) : null}

      {step === 5 ? (
        <Card style={styles.gap}>
          <ChoiceGroup label="Is the current medication list available?" options={["YES", "NO"]} value={mon.med_list_available} onSelect={(value) => setMon({ med_list_available: value as "YES" | "NO" })} />
          <ChoiceGroup label="Has the list changed since the previous visit?" options={["NO", "YES"]} value={mon.med_list_changed} onSelect={(value) => setMon({ med_list_changed: value as "NO" | "YES" })} />
          {mon.med_list_changed === "YES" ? (
            <TextField label="New / discontinued / changed medicines" value={mon.med_changes ?? ""} onChangeText={(med_changes) => setMon({ med_changes })} />
          ) : null}
          <ChoiceGroup label="Medicine adherence" options={MED_ADHERENCE} value={mon.med_adherence} onSelect={(med_adherence) => setMon({ med_adherence })} />
          <ChoiceGroup label="Any medicine-related concern?" options={["NO", "YES"]} value={mon.med_concern} onSelect={(value) => setMon({ med_concern: value as "NO" | "YES" })} />
          {mon.med_concern === "YES" ? (
            <TextField label="Concern details" value={mon.med_concern_details ?? ""} onChangeText={(med_concern_details) => setMon({ med_concern_details })} />
          ) : null}
          <ChoiceGroup label="Medicine stock" options={MED_STOCK} value={mon.med_stock} onSelect={(med_stock) => setMon({ med_stock })} />
          <ChoiceGroup
            label="Action required"
            options={MED_ACTIONS}
            value={mon.med_action}
            multi
            onSelect={(option) => setMon({ med_action: toggle(mon.med_action, option) })}
          />
        </Card>
      ) : null}

      {step === 6 ? (
        <Card style={styles.gap}>
          <ChoiceGroup label="Appetite" options={APPETITE_OPTIONS} value={mon.appetite} onSelect={(appetite) => setMon({ appetite })} />
          <ChoiceGroup label="Fluid intake" options={FLUID_OPTIONS} value={mon.fluid_intake} onSelect={(fluid_intake) => setMon({ fluid_intake })} />
          <ChoiceGroup label="Meals" options={MEAL_OPTIONS} value={mon.meals} onSelect={(meals) => setMon({ meals })} />
          <ChoiceGroup label="Sleep" options={SLEEP_OPTIONS} value={mon.sleep} onSelect={(sleep) => setMon({ sleep })} />
          <TextField label="Observations / concerns" value={mon.routine_notes ?? ""} onChangeText={(routine_notes) => setMon({ routine_notes })} />
        </Card>
      ) : null}

      {step === 7 ? (
        <Card style={styles.gap}>
          <ChoiceGroup label="Current mobility" options={MOBILITY_NOW} value={mon.mobility_current} onSelect={(mobility_current) => setMon({ mobility_current })} />
          <ChoiceGroup label="Since the previous visit" options={MOBILITY_CHANGE} value={mon.mobility_change} onSelect={(mobility_change) => setMon({ mobility_change })} />
          <ChoiceGroup
            label="Any difficulty with"
            options={MOBILITY_DIFFICULTY}
            value={mon.mobility_difficulty}
            multi
            onSelect={(option) => setMon({ mobility_difficulty: toggle(mon.mobility_difficulty, option) })}
          />
          <ChoiceGroup label="Any fall since the last visit?" options={["NO", "YES"]} value={mon.fall_since_last} onSelect={(value) => setMon({ fall_since_last: value as "NO" | "YES" })} />
          {mon.fall_since_last === "YES" ? (
            <>
              <TextField label="Date and approximate time" value={mon.fall_when ?? ""} onChangeText={(fall_when) => setMon({ fall_when })} />
              <TextField label="Injury reported / observed" value={mon.fall_injury ?? ""} onChangeText={(fall_injury) => setMon({ fall_injury })} />
              <TextField label="Action taken" value={mon.fall_action ?? ""} onChangeText={(fall_action) => setMon({ fall_action })} />
            </>
          ) : null}
        </Card>
      ) : null}

      {step === 8 ? (
        <Card style={styles.gap}>
          <ChoiceGroup label="Any new safety concern identified?" options={["NO", "YES"]} value={mon.new_safety_concern} onSelect={(value) => setMon({ new_safety_concern: value as "NO" | "YES" })} />
          {mon.new_safety_concern === "YES" ? (
            <>
              <TextField label="Details" value={mon.safety_details ?? ""} onChangeText={(safety_details) => setMon({ safety_details })} />
              <TextField label="Recommendation" value={mon.safety_recommendation ?? ""} onChangeText={(safety_recommendation) => setMon({ safety_recommendation })} />
            </>
          ) : null}
        </Card>
      ) : null}

      {step === 9 ? (
        <Card style={styles.gap}>
          <ChoiceGroup label="Personal hygiene" options={HYGIENE_OPTIONS} value={mon.hygiene} onSelect={(hygiene) => setMon({ hygiene })} />
          <ChoiceGroup label="Bathing" options={ADL_LEVELS} value={mon.bathing} onSelect={(bathing) => setMon({ bathing })} />
          <ChoiceGroup label="Dressing" options={ADL_LEVELS} value={mon.dressing} onSelect={(dressing) => setMon({ dressing })} />
          <ChoiceGroup label="Toileting" options={ADL_LEVELS} value={mon.toileting} onSelect={(toileting) => setMon({ toileting })} />
          <ChoiceGroup label="Eating" options={ADL_LEVELS} value={mon.eating} onSelect={(eating) => setMon({ eating })} />
          <ChoiceGroup label="Moving around home" options={ADL_LEVELS} value={mon.moving_home} onSelect={(moving_home) => setMon({ moving_home })} />
          <ChoiceGroup label="Significant change since previous visit?" options={["NO", "YES"]} value={mon.selfcare_change} onSelect={(value) => setMon({ selfcare_change: value as "NO" | "YES" })} />
          {mon.selfcare_change === "YES" ? (
            <TextField label="Details of the change" value={mon.selfcare_details ?? ""} onChangeText={(selfcare_details) => setMon({ selfcare_details })} />
          ) : null}
        </Card>
      ) : null}

      {step === 10 ? (
        <Card style={styles.gap}>
          <ChoiceGroup
            label="During the visit, the Care Recipient appears"
            options={MENTAL_APPEAR}
            value={mon.mental_appear}
            multi
            onSelect={(option) => setMon({ mental_appear: toggle(mon.mental_appear, option) })}
          />
          {mon.mental_appear?.includes("Other") ? (
            <TextField label="Other" value={mon.mental_other ?? ""} onChangeText={(mental_other) => setMon({ mental_other })} />
          ) : null}
          <ChoiceGroup
            label="Social interaction"
            options={SOCIAL_OPTIONS}
            value={mon.social}
            multi
            onSelect={(option) => setMon({ social: toggle(mon.social, option) })}
          />
          <ChoiceGroup
            label="Has the Care Recipient expressed"
            options={EXPRESSED_OPTIONS}
            value={mon.expressed}
            multi
            onSelect={(option) => setMon({ expressed: toggle(mon.expressed, option) })}
          />
          <TextField label="Care Recipient's comments" value={mon.mental_comments ?? ""} onChangeText={(mental_comments) => setMon({ mental_comments })} />
          <ChoiceGroup
            label="Action"
            options={MENTAL_ACTIONS}
            value={mon.mental_action}
            multi
            onSelect={(option) => setMon({ mental_action: toggle(mon.mental_action, option) })}
          />
        </Card>
      ) : null}

      {step === 11 ? (
        <Card style={styles.gap}>
          <Text style={[styles.section, { color: colors.ink }]}>Healthcare follow-up</Text>
          <ChoiceGroup
            label="Upcoming appointments"
            options={UPCOMING_OPTIONS}
            value={mon.upcoming}
            multi
            onSelect={(option) => setMon({ upcoming: toggle(mon.upcoming, option) })}
          />
          <TextField label="Appointment date / other" value={mon.upcoming_other ?? ""} onChangeText={(upcoming_other) => setMon({ upcoming_other })} />
          <TextField label="Date" value={mon.upcoming_date ?? ""} onChangeText={(upcoming_date) => setMon({ upcoming_date })} />
          <ChoiceGroup label="Pending medical investigations" options={["NONE", "YES"]} value={mon.pending_investigations} onSelect={(value) => setMon({ pending_investigations: value as "NONE" | "YES" })} />
          {mon.pending_investigations === "YES" ? (
            <TextField label="Specify" value={mon.pending_details ?? ""} onChangeText={(pending_details) => setMon({ pending_details })} />
          ) : null}
          <ChoiceGroup label="Follow-up required?" options={["NO", "YES"]} value={mon.healthcare_followup} onSelect={(value) => setMon({ healthcare_followup: value as "NO" | "YES" })} />
          {mon.healthcare_followup === "YES" ? (
            <TextField label="Specify" value={mon.healthcare_followup_details ?? ""} onChangeText={(healthcare_followup_details) => setMon({ healthcare_followup_details })} />
          ) : null}
          <Text style={[styles.section, { color: colors.ink }]}>Family & emergency contacts</Text>
          <ChoiceGroup label="Emergency contacts verified?" options={CONTACTS_VERIFIED} value={mon.contacts_verified} onSelect={(contacts_verified) => setMon({ contacts_verified })} />
          {mon.contacts_verified === "Information changed" ? (
            <TextField label="What changed" value={mon.contacts_change ?? ""} onChangeText={(contacts_change) => setMon({ contacts_change })} />
          ) : null}
          <ChoiceGroup label="Family communication required after today's visit?" options={FAMILY_COMM} value={mon.family_comm} onSelect={(family_comm) => setMon({ family_comm })} />
          {mon.family_comm && mon.family_comm !== "No" ? (
            <>
              <TextField label="Family member contacted and relationship" value={mon.family_contacted ?? ""} onChangeText={(family_contacted) => setMon({ family_contacted })} />
              <TextField label="Time" value={mon.family_time ?? ""} onChangeText={(family_time) => setMon({ family_time })} />
              <ChoiceGroup label="Mode of contact" options={FAMILY_MODE} value={mon.family_mode} onSelect={(family_mode) => setMon({ family_mode })} />
            </>
          ) : null}
        </Card>
      ) : null}

      {step === 12 ? (
        <Card style={styles.gap}>
          <ChoiceGroup
            label="Does the Care Recipient require assistance with"
            options={REQUEST_OPTIONS}
            value={mon.requests}
            multi
            onSelect={(option) => setMon({ requests: toggle(mon.requests, option) })}
          />
          {mon.requests?.includes("Other") ? (
            <TextField label="Other request" value={mon.requests_other ?? ""} onChangeText={(requests_other) => setMon({ requests_other })} />
          ) : null}
          <TextField label="Request details" value={mon.request_details ?? ""} onChangeText={(request_details) => setMon({ request_details })} />
          <ChoiceGroup
            label="Immediate action from today's visit"
            options={IMMEDIATE_ACTIONS}
            value={mon.immediate_action}
            multi
            onSelect={(option) => setMon({ immediate_action: toggle(mon.immediate_action, option) })}
          />
          {mon.immediate_action?.includes("Other") ? (
            <TextField label="Other action" value={mon.immediate_other ?? ""} onChangeText={(immediate_other) => setMon({ immediate_other })} />
          ) : null}
          <ChoiceGroup label="Follow-up required by DAYA CARES?" options={FOLLOWUP_WINDOWS} value={mon.followup_window} onSelect={(followup_window) => setMon({ followup_window })} />
          {mon.followup_window && mon.followup_window !== "No" ? (
            <TextField label="Follow-up date" value={mon.followup_date ?? ""} onChangeText={(followup_date) => setMon({ followup_date })} />
          ) : null}
        </Card>
      ) : null}

      {step === 13 ? (
        <Card style={styles.gap}>
          <ChoiceGroup
            label="Overall status today"
            options={OVERALL_STATUS.map((item) => item.label)}
            value={OVERALL_STATUS.find((item) => item.value === mon.overall_status)?.label}
            onSelect={(label) => setMon({ overall_status: OVERALL_STATUS.find((item) => item.label === label)?.value })}
          />
          <TextField label="Brief summary of today's visit" value={mon.visit_summary ?? ""} onChangeText={(visit_summary) => setMon({ visit_summary })} />
          <ChoiceGroup label="Does the Care Recipient require increased monitoring?" options={MONITORING_LEVEL} value={mon.increased_monitoring} onSelect={(increased_monitoring) => setMon({ increased_monitoring })} />
          {mon.increased_monitoring && mon.increased_monitoring !== "No" ? (
            <TextField label="Reason" value={mon.monitoring_reason ?? ""} onChangeText={(monitoring_reason) => setMon({ monitoring_reason })} />
          ) : null}
          <ChoiceGroup label="How was today's visit?" options={FEEDBACK_OPTIONS} value={mon.feedback} onSelect={(feedback) => setMon({ feedback })} />
          <TextField label="Suggestion / complaint / request" value={mon.feedback_notes ?? ""} onChangeText={(feedback_notes) => setMon({ feedback_notes })} />
          <Button
            label={photoUri ? "Retake visit photo" : "Photograph prescription or report"}
            variant="secondary"
            onPress={pickPhoto}
          />
          {photoUri ? <Text style={[styles.copy, { color: colors.success }]}>Photo attached</Text> : null}
        </Card>
      ) : null}

      {step === 14 ? (
        <Card style={styles.gap}>
          <Text style={[styles.section, { color: colors.ink }]}>Review for {customerName}</Text>
          <Text style={[styles.copy, { color: colors.ink }]}>
            BP {payload.vitals_payload.systolic_bp}/{payload.vitals_payload.diastolic_bp} · Pulse{" "}
            {payload.vitals_payload.pulse_bpm} · SpO₂ {payload.vitals_payload.spo2_percent}%
          </Text>
          <Text style={[styles.copy, { color: colors.inkMuted }]}>
            {mon.appearance ? `Appears ${mon.appearance}. ` : ""}
            {mon.overall_status ? `Assessment ${mon.overall_status}.` : ""}
          </Text>
          <ChoiceGroup label="Acknowledged by" options={ACK_ROLES} value={mon.ack_role} onSelect={(ack_role) => setMon({ ack_role })} />
          <TextField label="Name of Care Recipient or family representative" value={mon.ack_name ?? ""} onChangeText={(ack_name) => setMon({ ack_name })} />
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
            label={mutation.isPending ? "Saving…" : existingLog ? "Save changes" : "Submit visit log"}
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

function ChoiceGroup({
  label,
  options,
  value,
  onSelect,
  multi,
}: {
  label: string;
  options: string[];
  value?: string | string[];
  onSelect: (option: string) => void;
  multi?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.gap}>
      <Text style={[styles.section, { color: colors.ink, fontSize: 17 }]}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = Array.isArray(value) ? value.includes(option) : value === option;
          return <Chip key={option} label={option} selected={selected} onPress={() => onSelect(option)} />;
        })}
      </View>
    </View>
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
      <Text style={{ color: selected ? colors.white : colors.blue, fontSize: 15, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: space.lg,
    gap: space.md,
    paddingBottom: 48,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
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
