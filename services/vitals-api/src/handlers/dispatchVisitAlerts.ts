import {
  type HealthVisitLog,
  type VisitAlertResult,
  buildFamilyVisitMessage,
  deriveVisitAlert,
} from "@daya/shared";
import { getCustomer, getFamilyMappings, getUserById } from "../lib/db";
import { dispatchOpsAndWhatsApp, dispatchPushNotifications } from "../lib/sns";

export async function dispatchVisitAlerts(input: {
  log: HealthVisitLog;
  workerName: string;
}): Promise<VisitAlertResult> {
  const derived = deriveVisitAlert(input.log.vitals_payload, input.log.qualitative_observations);
  const customer = await getCustomer(input.log.customer_id);
  const customerUser = await getUserById(customer.user_id);
  const customerName = customerUser?.full_name ?? "Care Recipient";

  const mappings = await getFamilyMappings(input.log.customer_id);
  const familyUsers = (
    await Promise.all(mappings.map((mapping) => getUserById(mapping.family_user_id)))
  ).filter((user): user is NonNullable<typeof user> => Boolean(user));

  const message = buildFamilyVisitMessage({
    customerName,
    workerName: input.workerName,
    vitals: input.log.vitals_payload,
    severity: derived.severity,
  });

  const title =
    derived.severity === "CRITICAL"
      ? "Urgent Daya Cares visit alert"
      : "New Daya Cares visit log";

  const data = {
    type: "HEALTH_VISIT_LOG",
    log_id: input.log.log_id,
    customer_id: input.log.customer_id,
    severity: derived.severity,
  };

  await Promise.all(
    familyUsers.map((user) =>
      dispatchPushNotifications({
        userId: user.user_id,
        tokens: user.device_tokens ?? [],
        title,
        body: message,
        severity: derived.severity,
        data,
      }),
    ),
  );

  const extraChannels = await dispatchOpsAndWhatsApp({
    body: message,
    severity: derived.severity,
    customerId: input.log.customer_id,
    phones: [
      ...familyUsers.map((user) => user.phone_number),
      ...customer.emergency_contacts.map((contact) => contact.phone),
    ].filter(Boolean),
  });

  const channels: VisitAlertResult["channels"] = ["PUSH", ...extraChannels];

  return {
    severity: derived.severity,
    flags: derived.flags,
    notified_family_user_ids: familyUsers.map((user) => user.user_id),
    channels,
  };
}
