import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { requireUser } from "../lib/auth";
import { handleError, json } from "../lib/http";
import { listNotificationsForUser } from "../lib/notifications";

async function handle(event: APIGatewayProxyEvent) {
  const user = await requireUser(event);
  return json(200, await listNotificationsForUser(user.user_id));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
