import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import {
  type CreateHealthVisitLogRequest,
  type CreateHealthVisitLogResponse,
  type EntrySource,
  type HealthVisitLog,
  ENTRY_SOURCES,
  validateVitalsPayload,
} from "@daya/shared";
import { requireCaller } from "../lib/auth";
import {
  assertWorkerAssigned,
  getCustomer,
  getUserByCognitoSub,
  putHealthVisitLog,
} from "../lib/db";
import { DuplicateKeyError } from "../lib/mysql";
import { handleError, HttpError, json, parseBody } from "../lib/http";
import { dispatchVisitAlerts } from "./dispatchVisitAlerts";

function assertRequest(body: CreateHealthVisitLogRequest): CreateHealthVisitLogRequest {
  if (!body.customer_id) {
    throw new HttpError(400, "customer_id is required.");
  }
  if (!body.entry_source || !ENTRY_SOURCES.includes(body.entry_source as EntrySource)) {
    throw new HttpError(400, "entry_source must be WEB, ANDROID_APP, or IOS_APP.");
  }
  if (!body.vitals_payload || typeof body.vitals_payload !== "object") {
    throw new HttpError(400, "vitals_payload is required.");
  }

  const validation = validateVitalsPayload(body.vitals_payload, { requireCoreVitals: true });
  if (!validation.ok) {
    throw new HttpError(422, "Vitals payload failed validation.", validation);
  }

  return body;
}

async function handle(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, ["WORKER"]);
  const workerRecord = await getUserByCognitoSub(caller.cognito_sub);
  const worker = workerRecord
    ? { user_id: workerRecord.user_id, full_name: workerRecord.full_name }
    : caller.user_id
      ? { user_id: caller.user_id, full_name: caller.full_name ?? "Care Giver" }
      : undefined;

  if (!worker) {
    throw new HttpError(403, "Worker profile is not provisioned.");
  }

  const body = assertRequest(parseBody<CreateHealthVisitLogRequest>(event.body));
  await getCustomer(body.customer_id);
  await assertWorkerAssigned(worker.user_id, body.customer_id);

  const now = new Date().toISOString();
  const log: HealthVisitLog = {
    log_id: body.log_id ?? randomUUID(),
    customer_id: body.customer_id,
    worker_id: worker.user_id,
    visit_timestamp: body.visit_timestamp ?? now,
    entry_source: body.entry_source,
    vitals_payload: body.vitals_payload,
    qualitative_observations: body.qualitative_observations ?? {},
    visit_photo_s3_url: body.visit_photo_s3_url,
    created_at: now,
  };

  try {
    await putHealthVisitLog(log);
  } catch (error) {
    if (error instanceof DuplicateKeyError && body.log_id) {
      // Offline retry of an already-persisted draft. Continue so the client can complete sync.
    } else {
      throw error;
    }
  }

  const alert = await dispatchVisitAlerts({
    log,
    workerName: worker.full_name ?? caller.full_name ?? "Care Giver",
  });

  const response: CreateHealthVisitLogResponse = { log, alert };
  return json(201, response);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
