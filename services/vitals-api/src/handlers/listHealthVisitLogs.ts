import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { ListHealthVisitLogsResponse, UserRole } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import {
  assertCanAccessCustomer,
  getUserByCognitoSub,
  listCustomersForUser,
  listVisitSummaries,
} from "../lib/db";
import { handleError, HttpError, json } from "../lib/http";

const READ_ROLES: UserRole[] = ["WORKER", "FAMILY", "CUSTOMER", "ADMIN"];

async function handle(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, READ_ROLES);
  const user = await getUserByCognitoSub(caller.cognito_sub);
  if (!user) {
    throw new HttpError(403, "User profile is not provisioned.");
  }

  const customerId = event.queryStringParameters?.customer_id;
  const accessible = await listCustomersForUser(user);
  const allowedIds = new Set(accessible.map((customer) => customer.customer_id));

  if (customerId) {
    await assertCanAccessCustomer(user, customerId);
    const response: ListHealthVisitLogsResponse = {
      logs: await listVisitSummaries([customerId], 50),
    };
    return json(200, response);
  }

  const response: ListHealthVisitLogsResponse = {
    logs: await listVisitSummaries([...allowedIds], 50),
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
