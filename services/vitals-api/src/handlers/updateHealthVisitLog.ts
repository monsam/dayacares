import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { UpdateHealthVisitLogRequest } from "@daya/shared";
import { validateVitalsPayload } from "@daya/shared";
import { requireUser } from "../lib/auth";
import { updateHealthVisitLog } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  const user = await requireUser(event, ["ADMIN", "WORKER"]);
  const logId = event.pathParameters?.logId;
  if (!logId) throw new HttpError(400, "logId is required.");
  const body = parseBody<UpdateHealthVisitLogRequest>(event.body);
  if (body.vitals_payload) {
    const validation = validateVitalsPayload(body.vitals_payload, { requireCoreVitals: true });
    if (!validation.ok) {
      throw new HttpError(422, "Vitals payload failed validation.", validation);
    }
  }
  return json(200, { visit: await updateHealthVisitLog(logId, user, body) });
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
