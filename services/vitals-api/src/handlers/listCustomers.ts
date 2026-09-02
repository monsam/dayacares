import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { ListCustomersResponse, UserRole } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { assertCanAccessCustomer, getCustomerSummary, getUserByCognitoSub, listCustomersForUser } from "../lib/db";
import { handleError, HttpError, json } from "../lib/http";

const READ_ROLES: UserRole[] = ["WORKER", "FAMILY", "CUSTOMER", "ADMIN"];

async function callerUser(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, READ_ROLES);
  const user = await getUserByCognitoSub(caller.cognito_sub);
  if (!user) {
    throw new HttpError(403, "User profile is not provisioned.");
  }
  return user;
}

async function listHandle(event: APIGatewayProxyEvent) {
  const user = await callerUser(event);
  const response: ListCustomersResponse = {
    customers: await listCustomersForUser(user),
  };
  return json(200, response);
}

async function getHandle(event: APIGatewayProxyEvent) {
  const user = await callerUser(event);
  const customerId = event.pathParameters?.customerId;
  if (!customerId) {
    throw new HttpError(400, "customerId is required.");
  }
  await assertCanAccessCustomer(user, customerId);
  return json(200, await getCustomerSummary(customerId));
}

export const listCustomersHandler: APIGatewayProxyHandler = async (event) => {
  try {
    return await listHandle(event);
  } catch (error) {
    return handleError(error);
  }
};

export const getCustomerHandler: APIGatewayProxyHandler = async (event) => {
  try {
    return await getHandle(event);
  } catch (error) {
    return handleError(error);
  }
};
