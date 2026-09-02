import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { CreateDirectoryUserRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { createDirectoryUser } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const body = parseBody<CreateDirectoryUserRequest>(event.body);
  if (!body.full_name || !body.phone_number || !body.role) {
    throw new HttpError(400, "full_name, phone_number, and role are required.");
  }
  return json(201, await createDirectoryUser(body));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
