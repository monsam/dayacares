import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CareRecipientRegistration, RegistrationContact } from "@daya/shared";
import { createCareRecipient, listWorkers } from "../../api/customers";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { fontFamily, space, type } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { TextField } from "../../ui/TextField";

const STEPS = [
  "Office use & plan",
  "Section A — Care Recipient",
  "Section A — Address",
  "Sections B–C — Emergency",
  "Section D — Medical",
  "Section E — Doctors",
  "Family, consents & submit",
] as const;

const PLANS = ["Essential", "Enhanced", "Comprehensive"];
const CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Heart-related distress",
  "Respiratory distress",
  "Kidney-related ailments",
  "Stroke history",
  "Arthritis / mobility-related",
];
const DOCUMENTS = [
  "Recent photograph",
  "Identity proof",
  "Address proof",
  "Medical prescription / summary",
  "Health insurance details",
  "Emergency contact details",
];

function emptyContact(): RegistrationContact {
  return { name: "", relationship: "", phone: "", email: "" };
}

function last10(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

function emptyForm(): CareRecipientRegistration {
  return {
    office: { plan: "Enhanced", recipient_type: "INDIVIDUAL", payment_mode: "UPI" },
    recipient: { full_name: "", mobile: "", address: "" },
    emergency: { primary: emptyContact(), secondary: emptyContact(), approach: "COORDINATE" },
    medical: { conditions: [] },
    healthcare: {},
    family_updates: { create_login: true },
    consents: { payment_acknowledged: false, recipient_declared: false, documents: [] },
  };
}

export function RegisterCareRecipientWizard() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, ready } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CareRecipientRegistration>(emptyForm);
  const [error, setError] = useState<string>();

  const workersQuery = useQuery({
    queryKey: ["workers"],
    queryFn: listWorkers,
    enabled: session?.role === "ADMIN",
  });

  useEffect(() => {
    if (ready && session?.role !== "ADMIN") {
      router.replace(session ? "/home" : "/");
    }
  }, [ready, session, router]);

  const mutation = useMutation({
    mutationFn: () => createCareRecipient(form),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      const familyLine = result.family
        ? result.family.linked_existing
          ? ` Linked existing family login ${result.family.username}.`
          : ` Created family user ${result.family.username} (password Daya@2026).`
        : "";
      Alert.alert(
        "Care Recipient registered",
        `${result.customer.name} is now ${result.customer.customer_id} on the ${result.customer.plan} plan.${familyLine}`,
        [{ text: "View members", onPress: () => router.replace("/admin/members") }],
      );
    },
    onError: (err) => {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? err)
          : err instanceof Error
            ? err.message
            : "Could not save registration.";
      setError(message);
    },
  });

  const stepError = validateStep(step, form);
  const next = () => {
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(undefined);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.nav, { backgroundColor: colors.navy }]}>
        <Pressable onPress={() => router.push("/admin/members")} accessibilityRole="button">
          <Text style={styles.navBack}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Register</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.kicker, { color: colors.blue }]}>Care Recipient Registration Form</Text>
        <Text style={[styles.title, { color: colors.ink }]}>{STEPS[step]}</Text>
        <Text style={[styles.progress, { color: colors.inkMuted }]}>
          Step {step + 1} of {STEPS.length}
        </Text>
        <View style={[styles.track, { backgroundColor: colors.line }]}>
          <View style={[styles.trackFill, { width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: colors.blue }]} />
        </View>

        {step === 0 ? <OfficeStep form={form} setForm={setForm} /> : null}
        {step === 1 ? <RecipientStep form={form} setForm={setForm} /> : null}
        {step === 2 ? <AddressStep form={form} setForm={setForm} /> : null}
        {step === 3 ? <EmergencyStep form={form} setForm={setForm} /> : null}
        {step === 4 ? <MedicalStep form={form} setForm={setForm} /> : null}
        {step === 5 ? <HealthcareStep form={form} setForm={setForm} /> : null}
        {step === 6 ? (
          <FinalStep form={form} setForm={setForm} workers={workersQuery.data ?? []} />
        ) : null}

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        {error && /already (registered|exists|belongs)|different from the Care Recipient/i.test(error) ? (
          <View style={styles.actions}>
            <Button
              label="Edit Care Recipient mobile"
              variant="secondary"
              onPress={() => {
                setError(undefined);
                setStep(1);
              }}
            />
            <Button label="Open Members" variant="secondary" onPress={() => router.push("/admin/members")} />
          </View>
        ) : null}

        <View style={styles.actions}>
          {step > 0 ? (
            <Button label="Back" variant="secondary" onPress={() => { setError(undefined); setStep((current) => current - 1); }} />
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button label="Continue" onPress={next} />
          ) : (
            <Button
              label={mutation.isPending ? "Saving…" : "Submit registration"}
              onPress={() => {
                const lastError = validateStep(6, form);
                if (lastError) {
                  setError(lastError);
                  return;
                }
                setError(undefined);
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function validateStep(step: number, form: CareRecipientRegistration): string | undefined {
  if (step === 0 && !form.office.plan) return "Select a membership plan.";
  if (step === 1 && !form.recipient.full_name.trim()) return "Full name is required.";
  if (step === 1 && !form.recipient.mobile.trim()) return "Mobile number is required.";
  if (step === 2 && !form.recipient.address.trim()) return "Residential address is required.";
  if (step === 3 && (!form.emergency.primary.name.trim() || !form.emergency.primary.phone.trim())) {
    return "Primary emergency contact name and mobile are required.";
  }
  if (step === 6 && form.family_updates.create_login) {
    if (!form.family_updates.name?.trim() || !form.family_updates.mobile?.trim()) {
      return "Family name and mobile are required to create a family login.";
    }
    if (last10(form.family_updates.mobile) && last10(form.family_updates.mobile) === last10(form.recipient.mobile)) {
      return "Family mobile must be different from the Care Recipient mobile on Section A.";
    }
  }
  if (step === 6 && (!form.consents.payment_acknowledged || !form.consents.recipient_declared)) {
    return "Tick payment terms and the Care Recipient declaration.";
  }
  return undefined;
}

function OfficeStep({
  form,
  setForm,
}: {
  form: CareRecipientRegistration;
  setForm: (next: CareRecipientRegistration) => void;
}) {
  const { colors } = useTheme();
  const office = form.office;
  return (
    <Card style={styles.gap}>
      <Text style={[styles.section, { color: colors.ink }]}>Membership plan</Text>
      <View style={styles.chips}>
        {PLANS.map((plan) => (
          <Chip key={plan} label={plan} selected={office.plan === plan} onPress={() => setForm({ ...form, office: { ...office, plan } })} />
        ))}
      </View>
      <Text style={[styles.section, { color: colors.ink }]}>Care Recipient type</Text>
      <View style={styles.chips}>
        {(["INDIVIDUAL", "COMPANION"] as const).map((recipient_type) => (
          <Chip
            key={recipient_type}
            label={recipient_type === "INDIVIDUAL" ? "Individual" : "Companion"}
            selected={office.recipient_type === recipient_type}
            onPress={() => setForm({ ...form, office: { ...office, recipient_type } })}
          />
        ))}
      </View>
      <TextField label="Date of registration" value={office.registration_date ?? ""} onChangeText={(registration_date) => setForm({ ...form, office: { ...office, registration_date } })} placeholder="YYYY-MM-DD" />
      <TextField label="Date service commences" value={office.service_commences_on ?? ""} onChangeText={(service_commences_on) => setForm({ ...form, office: { ...office, service_commences_on } })} placeholder="YYYY-MM-DD" />
      <TextField label="Registration fee (₹)" value={office.registration_fee ?? ""} onChangeText={(registration_fee) => setForm({ ...form, office: { ...office, registration_fee } })} keyboardType="numeric" />
      <TextField label="Monthly membership fee (₹)" value={office.monthly_fee ?? ""} onChangeText={(monthly_fee) => setForm({ ...form, office: { ...office, monthly_fee } })} keyboardType="numeric" />
      <Text style={[styles.section, { color: colors.ink }]}>Mode of payment</Text>
      <View style={styles.chips}>
        {["Cash", "UPI", "Bank Transfer", "Other"].map((payment_mode) => (
          <Chip key={payment_mode} label={payment_mode} selected={office.payment_mode === payment_mode} onPress={() => setForm({ ...form, office: { ...office, payment_mode } })} />
        ))}
      </View>
      <TextField label="Payment date" value={office.payment_date ?? ""} onChangeText={(payment_date) => setForm({ ...form, office: { ...office, payment_date } })} placeholder="YYYY-MM-DD" />
      <TextField label="Payment reference" value={office.payment_reference ?? ""} onChangeText={(payment_reference) => setForm({ ...form, office: { ...office, payment_reference } })} />
    </Card>
  );
}

function RecipientStep({
  form,
  setForm,
}: {
  form: CareRecipientRegistration;
  setForm: (next: CareRecipientRegistration) => void;
}) {
  const { colors } = useTheme();
  const recipient = form.recipient;
  const set = (patch: Partial<typeof recipient>) => setForm({ ...form, recipient: { ...recipient, ...patch } });
  return (
    <Card style={styles.gap}>
      <TextField label="Full name" value={recipient.full_name} onChangeText={(full_name) => set({ full_name })} />
      <TextField label="Date of birth" value={recipient.date_of_birth ?? ""} onChangeText={(date_of_birth) => set({ date_of_birth })} placeholder="YYYY-MM-DD" />
      <Text style={[styles.section, { color: colors.ink }]}>Gender</Text>
      <View style={styles.chips}>
        {["Male", "Female"].map((gender) => (
          <Chip key={gender} label={gender} selected={recipient.gender === gender} onPress={() => set({ gender })} />
        ))}
      </View>
      <TextField label="Blood group" value={recipient.blood_group ?? ""} onChangeText={(blood_group) => set({ blood_group })} />
      <TextField label="Height (inch)" value={recipient.height_in ?? ""} onChangeText={(height_in) => set({ height_in })} keyboardType="decimal-pad" />
      <TextField label="Weight (kg)" value={recipient.weight_kg ?? ""} onChangeText={(weight_kg) => set({ weight_kg })} keyboardType="decimal-pad" />
      <TextField label="Oxygen saturation" value={recipient.spo2 ?? ""} onChangeText={(spo2) => set({ spo2 })} keyboardType="numeric" />
      <TextField label="Pulse rate" value={recipient.pulse ?? ""} onChangeText={(pulse) => set({ pulse })} keyboardType="numeric" />
      <TextField label="BP" value={recipient.bp ?? ""} onChangeText={(bp) => set({ bp })} placeholder="120/80" />
      <TextField label="Random sugar" value={recipient.sugar ?? ""} onChangeText={(sugar) => set({ sugar })} keyboardType="numeric" />
      <TextField label="Mobile number" value={recipient.mobile} onChangeText={(mobile) => set({ mobile })} keyboardType="phone-pad" />
      <TextField label="Alternate number" value={recipient.alternate_mobile ?? ""} onChangeText={(alternate_mobile) => set({ alternate_mobile })} keyboardType="phone-pad" />
      <TextField label="Email" value={recipient.email ?? ""} onChangeText={(email) => set({ email })} keyboardType="email-address" />
      <TextField label="Hobby" value={recipient.hobby ?? ""} onChangeText={(hobby) => set({ hobby })} />
    </Card>
  );
}

function AddressStep({
  form,
  setForm,
}: {
  form: CareRecipientRegistration;
  setForm: (next: CareRecipientRegistration) => void;
}) {
  const recipient = form.recipient;
  return (
    <Card style={styles.gap}>
      <TextField label="Full address (Durgapur)" value={recipient.address} onChangeText={(address) => setForm({ ...form, recipient: { ...recipient, address } })} />
      <TextField label="Landmark" value={recipient.landmark ?? ""} onChangeText={(landmark) => setForm({ ...form, recipient: { ...recipient, landmark } })} />
    </Card>
  );
}

function EmergencyStep({
  form,
  setForm,
}: {
  form: CareRecipientRegistration;
  setForm: (next: CareRecipientRegistration) => void;
}) {
  const { colors } = useTheme();
  const setPrimary = (patch: Partial<RegistrationContact>) =>
    setForm({ ...form, emergency: { ...form.emergency, primary: { ...form.emergency.primary, ...patch } } });
  const secondary = form.emergency.secondary ?? emptyContact();
  const setSecondary = (patch: Partial<RegistrationContact>) =>
    setForm({ ...form, emergency: { ...form.emergency, secondary: { ...secondary, ...patch } } });
  return (
    <Card style={styles.gap}>
      <Text style={[styles.section, { color: colors.ink }]}>Primary family / emergency contact</Text>
      <TextField label="Name" value={form.emergency.primary.name} onChangeText={(name) => setPrimary({ name })} />
      <TextField label="Relationship" value={form.emergency.primary.relationship} onChangeText={(relationship) => setPrimary({ relationship })} />
      <TextField label="Mobile" value={form.emergency.primary.phone} onChangeText={(phone) => setPrimary({ phone })} keyboardType="phone-pad" />
      <TextField label="Email" value={form.emergency.primary.email ?? ""} onChangeText={(email) => setPrimary({ email })} keyboardType="email-address" />
      <Text style={[styles.section, { color: colors.ink }]}>Secondary contact</Text>
      <TextField label="Name" value={secondary.name} onChangeText={(name) => setSecondary({ name })} />
      <TextField label="Relationship" value={secondary.relationship} onChangeText={(relationship) => setSecondary({ relationship })} />
      <TextField label="Mobile" value={secondary.phone} onChangeText={(phone) => setSecondary({ phone })} keyboardType="phone-pad" />
      <Text style={[styles.section, { color: colors.ink }]}>If family cannot be reached</Text>
      <View style={styles.chips}>
        <Chip
          label="DAYA may coordinate"
          selected={form.emergency.approach === "COORDINATE"}
          onPress={() => setForm({ ...form, emergency: { ...form.emergency, approach: "COORDINATE" } })}
        />
        <Chip
          label="Call additional person"
          selected={form.emergency.approach === "CONTACT_ADDITIONAL"}
          onPress={() => setForm({ ...form, emergency: { ...form.emergency, approach: "CONTACT_ADDITIONAL" } })}
        />
      </View>
      <TextField label="Additional person" value={form.emergency.extra_name ?? ""} onChangeText={(extra_name) => setForm({ ...form, emergency: { ...form.emergency, extra_name } })} />
      <TextField label="Additional mobile" value={form.emergency.extra_phone ?? ""} onChangeText={(extra_phone) => setForm({ ...form, emergency: { ...form.emergency, extra_phone } })} keyboardType="phone-pad" />
    </Card>
  );
}

function MedicalStep({
  form,
  setForm,
}: {
  form: CareRecipientRegistration;
  setForm: (next: CareRecipientRegistration) => void;
}) {
  const { colors } = useTheme();
  const medical = form.medical;
  const toggle = (condition: string) => {
    const conditions = medical.conditions.includes(condition)
      ? medical.conditions.filter((item) => item !== condition)
      : [...medical.conditions, condition];
    setForm({ ...form, medical: { ...medical, conditions } });
  };
  return (
    <Card style={styles.gap}>
      <Text style={[styles.section, { color: colors.ink }]}>Existing medical conditions</Text>
      <View style={styles.chips}>
        {CONDITIONS.map((condition) => (
          <Chip key={condition} label={condition} selected={medical.conditions.includes(condition)} onPress={() => toggle(condition)} />
        ))}
      </View>
      <TextField label="Other conditions" value={medical.other_conditions ?? ""} onChangeText={(other_conditions) => setForm({ ...form, medical: { ...medical, other_conditions } })} />
      <Text style={[styles.section, { color: colors.ink }]}>Mobility</Text>
      <View style={styles.chips}>
        {["Good", "Fair", "Poor", "Very poor", "Immobile"].map((mobility) => (
          <Chip key={mobility} label={mobility} selected={medical.mobility === mobility} onPress={() => setForm({ ...form, medical: { ...medical, mobility } })} />
        ))}
      </View>
      <TextField label="Allergies" value={medical.allergies ?? ""} onChangeText={(allergies) => setForm({ ...form, medical: { ...medical, allergies } })} />
      <TextField label="Current medication (name, dose, frequency)" value={medical.medications ?? ""} onChangeText={(medications) => setForm({ ...form, medical: { ...medical, medications } })} />
      <Chip label={`Regular medical supervision: ${medical.regular_supervision ? "Yes" : "No"}`} selected={Boolean(medical.regular_supervision)} onPress={() => setForm({ ...form, medical: { ...medical, regular_supervision: !medical.regular_supervision } })} />
      <Chip label={`Physiotherapy: ${medical.physiotherapy ? "Yes" : "No"}`} selected={Boolean(medical.physiotherapy)} onPress={() => setForm({ ...form, medical: { ...medical, physiotherapy: !medical.physiotherapy } })} />
      <Chip label={`Regular aaya: ${medical.aaya ? "Yes" : "No"}`} selected={Boolean(medical.aaya)} onPress={() => setForm({ ...form, medical: { ...medical, aaya: !medical.aaya } })} />
    </Card>
  );
}

function HealthcareStep({
  form,
  setForm,
}: {
  form: CareRecipientRegistration;
  setForm: (next: CareRecipientRegistration) => void;
}) {
  const { colors } = useTheme();
  const healthcare = form.healthcare;
  const set = (patch: Partial<typeof healthcare>) => setForm({ ...form, healthcare: { ...healthcare, ...patch } });
  return (
    <Card style={styles.gap}>
      <TextField label="Primary treating doctor" value={healthcare.primary_doctor ?? ""} onChangeText={(primary_doctor) => set({ primary_doctor })} />
      <TextField label="Speciality" value={healthcare.primary_speciality ?? ""} onChangeText={(primary_speciality) => set({ primary_speciality })} />
      <TextField label="Hospital / clinic" value={healthcare.primary_hospital ?? ""} onChangeText={(primary_hospital) => set({ primary_hospital })} />
      <TextField label="Doctor contact" value={healthcare.primary_contact ?? ""} onChangeText={(primary_contact) => set({ primary_contact })} keyboardType="phone-pad" />
      <TextField label="Preferred hospital" value={healthcare.preferred_hospital ?? ""} onChangeText={(preferred_hospital) => set({ preferred_hospital })} />
      <Chip label={`Health insurance: ${healthcare.insurance ? "Yes" : "No"}`} selected={Boolean(healthcare.insurance)} onPress={() => set({ insurance: !healthcare.insurance })} />
      <TextField label="Insurer" value={healthcare.insurer ?? ""} onChangeText={(insurer) => set({ insurer })} />
      <TextField label="Policy number" value={healthcare.policy_number ?? ""} onChangeText={(policy_number) => set({ policy_number })} />
    </Card>
  );
}

function FinalStep({
  form,
  setForm,
  workers,
}: {
  form: CareRecipientRegistration;
  setForm: (next: CareRecipientRegistration) => void;
  workers: { user_id: string; name: string }[];
}) {
  const { colors } = useTheme();
  const family = form.family_updates;
  const consents = form.consents;
  const toggleDoc = (document: string) => {
    const documents = consents.documents.includes(document)
      ? consents.documents.filter((item) => item !== document)
      : [...consents.documents, document];
    setForm({ ...form, consents: { ...consents, documents } });
  };
  return (
    <Card style={styles.gap}>
      <Text style={[styles.section, { color: colors.ink }]}>Section F — family updates</Text>
      <TextField label="Family member name" value={family.name ?? ""} onChangeText={(name) => setForm({ ...form, family_updates: { ...family, name } })} />
      <TextField label="Relationship" value={family.relationship ?? ""} onChangeText={(relationship) => setForm({ ...form, family_updates: { ...family, relationship } })} />
      <TextField label="Mobile / WhatsApp" value={family.mobile ?? ""} onChangeText={(mobile) => setForm({ ...form, family_updates: { ...family, mobile } })} keyboardType="phone-pad" />
      <TextField label="Email" value={family.email ?? ""} onChangeText={(email) => setForm({ ...form, family_updates: { ...family, email } })} keyboardType="email-address" />
      <Chip
        label={family.create_login ? "Create / link family login: Yes" : "Create family login: No"}
        selected={Boolean(family.create_login)}
        onPress={() => setForm({ ...form, family_updates: { ...family, create_login: !family.create_login } })}
      />
      <Text style={[styles.section, { color: colors.ink }]}>Assign Care Giver</Text>
      <View style={styles.chips}>
        {workers.map((worker) => (
          <Chip
            key={worker.user_id}
            label={worker.name}
            selected={consents.assign_worker_id === worker.user_id}
            onPress={() =>
              setForm({
                ...form,
                consents: {
                  ...consents,
                  assign_worker_id: consents.assign_worker_id === worker.user_id ? undefined : worker.user_id,
                },
              })
            }
          />
        ))}
      </View>
      <Text style={[styles.section, { color: colors.ink }]}>Section K — documents received</Text>
      <View style={styles.chips}>
        {DOCUMENTS.map((document) => (
          <Chip key={document} label={document} selected={consents.documents.includes(document)} onPress={() => toggleDoc(document)} />
        ))}
      </View>
      <Chip
        label={consents.payment_acknowledged ? "Section H payment terms: acknowledged" : "Acknowledge Section H payment terms"}
        selected={consents.payment_acknowledged}
        onPress={() => setForm({ ...form, consents: { ...consents, payment_acknowledged: !consents.payment_acknowledged } })}
      />
      <Chip
        label={consents.recipient_declared ? "Section J declaration: signed" : "Confirm Section J Care Recipient declaration"}
        selected={consents.recipient_declared}
        onPress={() => setForm({ ...form, consents: { ...consents, recipient_declared: !consents.recipient_declared } })}
      />
      <Text style={[styles.copy, { color: colors.inkMuted }]}>
        Review: {form.recipient.full_name || "Unnamed"} · mobile {form.recipient.mobile || "missing"} · {form.office.plan} {form.office.recipient_type} · {form.recipient.address || "No address"}
      </Text>
      <Text style={[styles.copy, { color: colors.inkMuted }]}>
        The family WhatsApp on this page creates the family login. The number that must be unique is the Care Recipient mobile from Section A. If that person is already on Members, do not submit again.
      </Text>
    </Card>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { backgroundColor: selected ? colors.blue : colors.white, borderColor: colors.blue }]}
    >
      <Text style={{ color: selected ? colors.white : colors.blue, fontSize: 16, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: {
    minHeight: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBack: { fontFamily, color: "#FFFFFF", fontSize: 16, fontWeight: "600", width: 56 },
  navTitle: { fontFamily, color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  page: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  kicker: { fontFamily, fontSize: 16, fontWeight: "800" },
  title: { fontFamily, fontSize: type.title, fontWeight: "800" },
  progress: { fontFamily, fontSize: 16 },
  track: { height: 8, borderRadius: 99, overflow: "hidden" },
  trackFill: { height: 8 },
  section: { fontFamily, fontSize: 20, fontWeight: "800" },
  copy: { fontFamily, fontSize: type.body, lineHeight: 26 },
  error: { fontFamily, fontSize: 16, lineHeight: 22 },
  gap: { gap: space.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  actions: { gap: space.sm },
});
