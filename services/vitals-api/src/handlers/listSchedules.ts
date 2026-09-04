import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { ListSchedulesResponse, UserRole } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { getUserByCognitoSub, listSchedulesForUser } from "../lib/db";
import { handleError, HttpError, json } from "../lib/http";
import { centreDateStamp } from "../lib/timezone";

const READ_ROLES: UserRole[] = ["WORKER", "FAMILY", "CUSTOMER", "ADMIN"];

async function handle(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, READ_ROLES);
  const user = await getUserByCognitoSub(caller.cognito_sub);
  if (!user) {
    throw new HttpError(403, "User profile is not provisioned.");
  }
  const date = event.queryStringParameters?.date?.trim() || centreDateStamp();
  const response: ListSchedulesResponse = {
    date,
    schedules: await listSchedulesForUser(user, date),
  };
  return json(200, response);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
