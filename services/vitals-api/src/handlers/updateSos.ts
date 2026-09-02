import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { UpdateSosRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { updateSos } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const incidentId = event.pathParameters?.incidentId;
  if (!incidentId) {
    throw new HttpError(400, "incidentId is required.");
  }
  return json(200, await updateSos(incidentId, parseBody<UpdateSosRequest>(event.body)));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
