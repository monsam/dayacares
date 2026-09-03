import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { UpdateNotificationRequest } from "@daya/shared";
import { requireUser } from "../lib/auth";
import { handleError, HttpError, json, parseBody } from "../lib/http";
import { markNotificationRead } from "../lib/notifications";

async function handle(event: APIGatewayProxyEvent) {
  const user = await requireUser(event);
  const notificationId = event.pathParameters?.notificationId;
  if (!notificationId) {
    throw new HttpError(400, "notificationId is required.");
  }
  const body = event.body ? parseBody<UpdateNotificationRequest>(event.body) : { read: true };
  if (body.read === false) {
    throw new HttpError(400, "Notifications can only be marked read.");
  }
  return json(200, await markNotificationRead(user.user_id, notificationId));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
