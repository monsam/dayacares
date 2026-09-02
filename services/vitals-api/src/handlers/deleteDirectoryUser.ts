import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { requireCaller } from "../lib/auth";
import { deleteDirectoryUser } from "../lib/db";
import { handleError, HttpError, json } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, ["ADMIN"]);
  const userId = event.pathParameters?.userId;
  if (!userId) {
    throw new HttpError(400, "userId is required.");
  }
  await deleteDirectoryUser(userId, caller.user_id);
  return json(200, { ok: true });
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
