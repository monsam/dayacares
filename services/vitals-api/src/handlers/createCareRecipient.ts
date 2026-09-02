import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { CreateCareRecipientRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { createCareRecipient } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const body = parseBody<CreateCareRecipientRequest>(event.body);
  if (!body.registration) {
    throw new HttpError(400, "registration payload is required.");
  }
  const created = await createCareRecipient(body.registration);
  return json(201, created);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
