import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { UpdateDirectoryUserRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { updateDirectoryUser } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, ["ADMIN"]);
  const userId = event.pathParameters?.userId;
  if (!userId) {
    throw new HttpError(400, "userId is required.");
  }
  const body = parseBody<UpdateDirectoryUserRequest>(event.body);
  return json(200, await updateDirectoryUser(userId, body, caller.user_id));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
