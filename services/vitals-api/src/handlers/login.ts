import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { LoginRequest } from "@daya/shared";
import { loginUser } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  const body = parseBody<LoginRequest>(event.body);
  if (!body.username?.trim() || !body.password) {
    throw new HttpError(400, "Username and password are required.");
  }
  return json(200, await loginUser(body.username, body.password));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
