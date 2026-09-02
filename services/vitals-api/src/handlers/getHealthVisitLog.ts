import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { GetHealthVisitLogResponse, UserRole } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { assertCanAccessCustomer, getUserByCognitoSub, getVisitSummary } from "../lib/db";
import { handleError, HttpError, json } from "../lib/http";

const READ_ROLES: UserRole[] = ["WORKER", "FAMILY", "CUSTOMER", "ADMIN"];

async function handle(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, READ_ROLES);
  const user = await getUserByCognitoSub(caller.cognito_sub);
  if (!user) {
    throw new HttpError(403, "User profile is not provisioned.");
  }

  const logId = event.pathParameters?.logId;
  if (!logId) {
    throw new HttpError(400, "logId is required.");
  }

  const visit = await getVisitSummary(logId);
  await assertCanAccessCustomer(user, visit.log.customer_id);
  const response: GetHealthVisitLogResponse = { visit };
  return json(200, response);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
