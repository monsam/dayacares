import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { UpdateSubscriptionRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { updateSubscription } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const customerId = event.pathParameters?.customerId;
  if (!customerId) {
    throw new HttpError(400, "customerId is required.");
  }
  const body = parseBody<UpdateSubscriptionRequest>(event.body);
  if (!body.subscription_status) {
    throw new HttpError(400, "subscription_status is required.");
  }
  await updateSubscription(customerId, body.subscription_status);
  return json(200, { ok: true });
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
