import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { UpdateScheduleRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { updateSchedule } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const scheduleId = event.pathParameters?.scheduleId;
  if (!scheduleId) {
    throw new HttpError(400, "scheduleId is required.");
  }
  const body = parseBody<UpdateScheduleRequest>(event.body);
  return json(200, await updateSchedule(scheduleId, body));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
