import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { requireCaller } from "../lib/auth";
import { unassignWorker } from "../lib/db";
import { handleError, HttpError, json } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const allocationId = event.pathParameters?.allocationId;
  if (!allocationId) {
    throw new HttpError(400, "allocationId is required.");
  }
  await unassignWorker(allocationId);
  return json(200, { ok: true });
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
