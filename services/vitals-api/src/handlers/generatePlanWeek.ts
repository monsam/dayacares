import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { GeneratePlanWeekRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { handleError, json, parseBody } from "../lib/http";
import { generatePlanWeek } from "../lib/ops";
import { centreDateStamp } from "../lib/timezone";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const body = event.body ? parseBody<GeneratePlanWeekRequest>(event.body) : {};
  const date = body.date?.trim() || event.queryStringParameters?.date?.trim() || centreDateStamp();
  return json(200, await generatePlanWeek(date));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
