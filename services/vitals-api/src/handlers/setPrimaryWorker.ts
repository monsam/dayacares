import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { requireCaller } from "../lib/auth";
import { setPrimaryWorker } from "../lib/db";
import { handleError, HttpError, json } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const allocationId = event.pathParameters?.allocationId;
  if (!allocationId) throw new HttpError(400, "allocationId is required.");
  return json(200, await setPrimaryWorker(allocationId));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
