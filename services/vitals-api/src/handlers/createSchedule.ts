import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { CreateScheduleRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { createSchedule } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const body = parseBody<CreateScheduleRequest>(event.body);
  if (!body.customer_id || !body.worker_id || !body.scheduled_for) {
    throw new HttpError(400, "customer_id, worker_id, and scheduled_for are required.");
  }
  return json(201, await createSchedule(body));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
