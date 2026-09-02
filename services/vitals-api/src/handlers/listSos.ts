import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { ListSosResponse, UserRole } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { getUserByCognitoSub, listSosForUser } from "../lib/db";
import { handleError, HttpError, json } from "../lib/http";

const READ_ROLES: UserRole[] = ["WORKER", "FAMILY", "CUSTOMER", "ADMIN"];

async function handle(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, READ_ROLES);
  const user = await getUserByCognitoSub(caller.cognito_sub);
  if (!user) {
    throw new HttpError(403, "User profile is not provisioned.");
  }
  const response: ListSosResponse = { incidents: await listSosForUser(user) };
  return json(200, response);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
