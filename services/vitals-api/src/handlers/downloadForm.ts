import type { APIGatewayProxyEvent } from "aws-lambda";
import type { ReportFormKind } from "@daya/shared";
import { REPORT_FORM_KINDS } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { getFormSource, getUserById } from "../lib/db";
import { HttpError } from "../lib/http";
import { REPORT_FORMS, buildFilledForm, filledFilename, readBlankForm } from "../lib/pdfForms";

function kindOf(value: string): ReportFormKind {
  if (!REPORT_FORM_KINDS.includes(value as ReportFormKind)) {
    throw new HttpError(404, "That form is not available.");
  }
  return value as ReportFormKind;
}

async function actor(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, ["ADMIN", "WORKER", "FAMILY", "CUSTOMER"]);
  if (!caller.user_id) {
    throw new HttpError(401, "Missing user identity.");
  }
  const user = await getUserById(caller.user_id);
  if (!user) {
    throw new HttpError(401, "Unknown account.");
  }
  return user;
}

export function listForms() {
  return { forms: REPORT_FORMS };
}

export async function filledForm(event: APIGatewayProxyEvent, kind: string) {
  const user = await actor(event);
  const formKind = kindOf(kind);
  const meta = REPORT_FORMS.find((item) => item.id === formKind);
  const customerId = event.queryStringParameters?.customer_id;
  const logId = event.queryStringParameters?.log_id;
  if (meta?.needs_customer && !customerId && !logId) {
    throw new HttpError(400, "Choose a Care Focus to prefill this form.");
  }
  const source = await getFormSource(user, { customerId, logId });
  const bytes = await buildFilledForm(formKind, source);
  return { bytes, filename: filledFilename(formKind, source) };
}

export function blankForm(kind: string) {
  const file = readBlankForm(kindOf(kind));
  if (!file) {
    throw new HttpError(404, "The original paper form is not on this server.");
  }
  return file;
}
