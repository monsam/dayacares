import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { requireUser } from "../lib/auth";
import { handleError, HttpError, json } from "../lib/http";
import { getNotificationForUser } from "../lib/notifications";

async function handle(event: APIGatewayProxyEvent) {
  const user = await requireUser(event);
  const notificationId = event.pathParameters?.notificationId;
  if (!notificationId) {
    throw new HttpError(400, "notificationId is required.");
  }
  return json(200, await getNotificationForUser(user.user_id, notificationId));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
