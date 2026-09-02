import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { CreateSosRequest, UserRole } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { createSos, getUserByCognitoSub } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

const ROLES: UserRole[] = ["WORKER", "FAMILY", "CUSTOMER", "ADMIN"];

async function handle(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, ROLES);
  const user = await getUserByCognitoSub(caller.cognito_sub);
  if (!user) {
    throw new HttpError(403, "User profile is not provisioned.");
  }
  const body = event.body ? parseBody<CreateSosRequest>(event.body) : {};
  return json(201, await createSos(user, body));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
