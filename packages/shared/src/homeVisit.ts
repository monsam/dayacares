import type { HomeVisitMonitoring, PhysicalMobility, QualitativeObservations } from "./types";

export const PRESENT_OPTIONS = [
  "Care Recipient alone",
  "Spouse",
  "Family member",
  "Domestic help",
  "Caregiver",
  "Other",
];

export const APPEARANCE_OPTIONS = [
  "Well and comfortable",
  "Generally well",
  "Tired / weak",
  "Unusually quiet / withdrawn",
  "Anxious / distressed",
  "Confused / disoriented",
  "Appears unwell",
  "Other concern",
];

export const VS_PREVIOUS_OPTIONS = [
  "No significant change",
  "Better",
  "Slightly worse",
  "Significantly worse",
  "Unable to assess",
];

export const URGENT_FLAGS = [
  "Chest pain / severe discomfort",
  "Difficulty breathing",
  "Sudden weakness / difficulty speaking",
  "Loss of consciousness / unusual drowsiness",
  "Fall / injury",
  "Severe bleeding",
  "High fever / severe illness reported",
  "Sudden confusion / unusual behavior",
  "Severe pain",
  "Suspected medication-related problem",
  "Care Recipient cannot safely remain alone",
  "Other",
];

export const URGENT_ACTIONS = [
  "Centre In-charge informed",
  "Family informed",
  "Doctor contacted",
  "Ambulance arranged",
  "Hospital advised",
  "Emergency SOP activated",
  "No immediate action required",
  "Other",
];

export const GENERAL_OBS = [
  "Breathing appears normal",
  "Difficulty in breathing observed/reported",
  "Walking appears normal for the Care Recipient",
  "Mobility appears reduced",
  "Swelling noticed/reported",
  "Pain reported",
  "Other",
];

export const MED_ADHERENCE = [
  "Taking medicines as prescribed",
  "Occasionally missing medicines",
  "Frequently missing medicines",
  "Refuses / unable to take medicines",
  "Requires assistance",
  "Unclear",
];

export const MED_STOCK = ["Adequate", "Running low", "Urgently required", "Unable to assess"];

export const MED_ACTIONS = [
  "Medicine procurement coordination",
  "Family informed",
  "Doctor/pharmacy contacted",
  "No action required",
];

export const APPETITE_OPTIONS = ["Normal", "Reduced", "Significantly reduced", "Increased", "Unable to assess"];
export const FLUID_OPTIONS = ["Appears adequate", "Possibly inadequate", "Concern reported"];
export const MEAL_OPTIONS = [
  "Preparing meals independently",
  "Family arranging meals",
  "Domestic help arranging meals",
  "Requires assistance",
  "Concern regarding availability of food",
];
export const SLEEP_OPTIONS = ["Normal", "Disturbed", "Excessive sleeping", "Difficulty sleeping", "Concern reported"];

export const MOBILITY_NOW = [
  "Walks independently",
  "Uses walking stick",
  "Uses walker",
  "Uses wheelchair",
  "Requires assistance",
  "Mostly bed-bound",
];

export const MOBILITY_CHANGE = [
  "No change",
  "Mobility improved",
  "Mobility reduced",
  "Fall reported",
  "Near-fall reported",
];

export const MOBILITY_DIFFICULTY = [
  "Getting out of bed",
  "Sitting/standing",
  "Walking",
  "Stairs",
  "Bathroom access",
  "Getting into/out of vehicle",
];

export const HYGIENE_OPTIONS = [
  "Maintaining personal hygiene independently",
  "Requires occasional assistance",
  "Requires regular assistance",
  "Concern observed/reported",
];

export const ADL_LEVELS = ["Independent", "Assistance", "Unable"];

export const MENTAL_APPEAR = [
  "Cheerful / comfortable",
  "Communicative",
  "Lonely",
  "Withdrawn",
  "Anxious",
  "Irritable",
  "Sad / low in mood",
  "Confused",
  "Other",
];

export const SOCIAL_OPTIONS = [
  "Regular interaction with family",
  "Regular interaction with friends/neighbours",
  "Participates in social activities",
  "Mostly stays alone",
  "Limited social interaction",
];

export const EXPRESSED_OPTIONS = [
  "Feeling lonely",
  "Feeling unsafe",
  "Difficulty coping",
  "Anxiety regarding health",
  "Family-related concern",
  "No particular concern",
];

export const MENTAL_ACTIONS = [
  "No action required",
  "Companionship / additional interaction suggested",
  "Family informed",
  "Centre In-charge informed",
  "Professional counseling/support may be considered",
];

export const UPCOMING_OPTIONS = ["None", "Doctor", "Diagnostic test", "Hospital", "Physiotherapy", "Other"];

export const CONTACTS_VERIFIED = ["Yes", "No change", "Information changed"];

export const FAMILY_COMM = [
  "No",
  "Yes — routine update",
  "Yes — significant concern",
  "Yes — urgent concern",
];

export const FAMILY_MODE = ["Phone", "WhatsApp", "Video Call", "Other"];

export const REQUEST_OPTIONS = [
  "Medicine procurement",
  "Doctor appointment",
  "Diagnostic test",
  "Hospital visit",
  "Tele-consultation",
  "Ambulance information",
  "Medical document organisation",
  "Family communication",
  "Home safety improvement",
  "Nursing / physiotherapy coordination",
  "Other",
];

export const IMMEDIATE_ACTIONS = [
  "None",
  "Centre In-charge intervention",
  "Family intervention",
  "Doctor consultation",
  "Hospital visit",
  "Ambulance",
  "Medicine procurement",
  "Diagnostic coordination",
  "Home safety intervention",
  "Other",
];

export const FOLLOWUP_WINDOWS = [
  "No",
  "Yes — within 24 hours",
  "Yes — within 48 hours",
  "Yes — within 7 days",
  "Other",
];

export const OVERALL_STATUS = [
  { value: "STABLE" as const, label: "Stable" },
  { value: "ATTENTION" as const, label: "Attention required" },
  { value: "URGENT" as const, label: "Urgent intervention required" },
];

export const MONITORING_LEVEL = ["No", "Yes — temporarily", "Yes — ongoing"];

export const FEEDBACK_OPTIONS = ["Very satisfactory", "Satisfactory", "Unsatisfactory", "Very Unsatisfactory"];

export const ACK_ROLES = ["Care Recipient", "Family representative"];

export function listed(values?: string[]) {
  return values?.length ? values.join(" · ") : undefined;
}

export function mobilityFromPaper(value?: string): PhysicalMobility | undefined {
  if (value === "Walks independently") return "INDEPENDENT";
  if (value === "Uses walking stick") return "WALKING_STICK";
  if (value === "Uses walker") return "WALKER";
  if (value === "Uses wheelchair") return "WHEELCHAIR";
  if (value === "Requires assistance") return "ASSISTED";
  if (value === "Mostly bed-bound") return "OTHER";
  return undefined;
}

export function needsFollowUp(observations: QualitativeObservations) {
  const m = observations.monitoring;
  if (!m) return Boolean(observations.action_items_needed);
  return (
    m.immediate_concern === "YES" ||
    m.overall_status === "URGENT" ||
    m.overall_status === "ATTENTION" ||
    (m.followup_window != null && m.followup_window !== "No") ||
    m.family_comm === "Yes — urgent concern" ||
    Boolean(observations.action_items_needed)
  );
}

export function monitoringRows(monitoring?: HomeVisitMonitoring) {
  if (!monitoring) return [];
  const rows: Array<{ section: string; label: string; value: string }> = [];
  const add = (section: string, label: string, value?: string | string[] | null) => {
    const text = Array.isArray(value) ? listed(value) : value?.trim();
    if (text) rows.push({ section, label, value: text });
  };

  add("1 Visit identification", "Who was present", listed(monitoring.present));
  add("1 Visit identification", "Other present", monitoring.present_other);
  add("1 Visit identification", "Name & relationship", monitoring.present_name);
  add("1 Visit identification", "Arrival", monitoring.arrival_time);
  add("1 Visit identification", "Departure", monitoring.departure_time);

  add("2 General well-being", "Appearance today", monitoring.appearance);
  add("2 General well-being", "Compared with previous visit", monitoring.vs_previous);
  add("2 General well-being", "What has changed", monitoring.what_changed);
  add("2 General well-being", "Care Recipient concerns", monitoring.recipient_concerns);

  add("3 Emergency screening", "Immediate concern", monitoring.immediate_concern);
  add("3 Emergency screening", "Urgent flags", listed(monitoring.urgent_flags));
  add("3 Emergency screening", "Other urgent detail", monitoring.urgent_other);
  add("3 Emergency screening", "Action taken", listed(monitoring.urgent_actions));
  add("3 Emergency screening", "Time of escalation", monitoring.escalation_time);

  add("4 Health observation", "Unusual observation", monitoring.unusual_observation);
  add("4 Health observation", "General observation", listed(monitoring.general_observation));
  add("4 Health observation", "Other observation", monitoring.general_other);

  add("5 Medication", "Medication list available", monitoring.med_list_available);
  add("5 Medication", "List changed", monitoring.med_list_changed);
  add("5 Medication", "Medicine changes", monitoring.med_changes);
  add("5 Medication", "Adherence", monitoring.med_adherence);
  add("5 Medication", "Medicine concern", monitoring.med_concern);
  add("5 Medication", "Concern details", monitoring.med_concern_details);
  add("5 Medication", "Medicine stock", monitoring.med_stock);
  add("5 Medication", "Medicine action", listed(monitoring.med_action));

  add("6 Food, water & routine", "Appetite", monitoring.appetite);
  add("6 Food, water & routine", "Fluid intake", monitoring.fluid_intake);
  add("6 Food, water & routine", "Meals", monitoring.meals);
  add("6 Food, water & routine", "Sleep", monitoring.sleep);
  add("6 Food, water & routine", "Observations", monitoring.routine_notes);

  add("7 Mobility & falls", "Current mobility", monitoring.mobility_current);
  add("7 Mobility & falls", "Since previous visit", monitoring.mobility_change);
  add("7 Mobility & falls", "Difficulty with", listed(monitoring.mobility_difficulty));
  add("7 Mobility & falls", "Fall since last visit", monitoring.fall_since_last);
  add("7 Mobility & falls", "Fall time", monitoring.fall_when);
  add("7 Mobility & falls", "Injury", monitoring.fall_injury);
  add("7 Mobility & falls", "Action taken", monitoring.fall_action);

  add("8 Home safety", "New safety concern", monitoring.new_safety_concern);
  add("8 Home safety", "Details", monitoring.safety_details);
  add("8 Home safety", "Recommendation", monitoring.safety_recommendation);

  add("9 Hygiene & self-care", "Hygiene", monitoring.hygiene);
  add("9 Hygiene & self-care", "Bathing", monitoring.bathing);
  add("9 Hygiene & self-care", "Dressing", monitoring.dressing);
  add("9 Hygiene & self-care", "Toileting", monitoring.toileting);
  add("9 Hygiene & self-care", "Eating", monitoring.eating);
  add("9 Hygiene & self-care", "Moving around home", monitoring.moving_home);
  add("9 Hygiene & self-care", "Significant change", monitoring.selfcare_change);
  add("9 Hygiene & self-care", "Change details", monitoring.selfcare_details);

  add("10 Mental well-being", "Appears", listed(monitoring.mental_appear));
  add("10 Mental well-being", "Other", monitoring.mental_other);
  add("10 Mental well-being", "Social interaction", listed(monitoring.social));
  add("10 Mental well-being", "Expressed", listed(monitoring.expressed));
  add("10 Mental well-being", "Comments", monitoring.mental_comments);
  add("10 Mental well-being", "Action", listed(monitoring.mental_action));

  add("11 Healthcare follow-up", "Upcoming appointments", listed(monitoring.upcoming));
  add("11 Healthcare follow-up", "Other appointment", monitoring.upcoming_other);
  add("11 Healthcare follow-up", "Appointment date", monitoring.upcoming_date);
  add("11 Healthcare follow-up", "Pending investigations", monitoring.pending_investigations);
  add("11 Healthcare follow-up", "Investigation details", monitoring.pending_details);
  add("11 Healthcare follow-up", "Follow-up required", monitoring.healthcare_followup);
  add("11 Healthcare follow-up", "Follow-up details", monitoring.healthcare_followup_details);

  add("12 Family & contacts", "Emergency contacts verified", monitoring.contacts_verified);
  add("12 Family & contacts", "Contact change", monitoring.contacts_change);
  add("12 Family & contacts", "Family communication", monitoring.family_comm);
  add("12 Family & contacts", "Family contacted", monitoring.family_contacted);
  add("12 Family & contacts", "Contact time", monitoring.family_time);
  add("12 Family & contacts", "Mode", monitoring.family_mode);

  add("13 Requests", "Assistance requested", listed(monitoring.requests));
  add("13 Requests", "Other request", monitoring.requests_other);
  add("13 Requests", "Details", monitoring.request_details);

  add("14 Actions", "Immediate action", listed(monitoring.immediate_action));
  add("14 Actions", "Other action", monitoring.immediate_other);
  add("14 Actions", "DAYA follow-up", monitoring.followup_window);
  add("14 Actions", "Follow-up date", monitoring.followup_date);

  add("15 Overall assessment", "Overall status", monitoring.overall_status);
  add("15 Overall assessment", "Visit summary", monitoring.visit_summary);
  add("15 Overall assessment", "Increased monitoring", monitoring.increased_monitoring);
  add("15 Overall assessment", "Reason", monitoring.monitoring_reason);

  add("16 Feedback", "How was today's visit", monitoring.feedback);
  add("16 Feedback", "Suggestion / complaint", monitoring.feedback_notes);

  add("17 Acknowledgement", "Acknowledged by", monitoring.ack_name);
  add("17 Acknowledgement", "Role", monitoring.ack_role);

  return rows;
}
