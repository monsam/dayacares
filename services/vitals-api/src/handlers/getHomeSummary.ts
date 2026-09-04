import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { HomeSummaryResponse, UserRole } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import {
  getUserByCognitoSub,
  listCareTeam,
  listCustomersForUser,
  listRecentVisitSummaries,
  listOpenSosForUser,
  listSchedulesForUser,
  listUpcomingSchedules,
} from "../lib/db";
import { handleError, HttpError, json } from "../lib/http";

const READ_ROLES: UserRole[] = ["WORKER", "FAMILY", "CUSTOMER", "ADMIN"];

async function handle(event: APIGatewayProxyEvent) {
  const caller = await requireCaller(event, READ_ROLES);
  const user = await getUserByCognitoSub(caller.cognito_sub);
  if (!user) {
    throw new HttpError(403, "User profile is not provisioned.");
  }

  const date = event.queryStringParameters?.date?.trim();
  const customers = await listCustomersForUser(user);
  const logs = await listRecentVisitSummaries(customers.map((customer) => customer.customer_id));
  const team = await listCareTeam(user, customers);
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
  const schedules =
    user.role === "ADMIN" || user.role === "WORKER"
      ? (await listSchedulesForUser(user, day)).filter((visit) => visit.status !== "CANCELLED")
      : await listUpcomingSchedules(user);
  const open_sos = await listOpenSosForUser(user);
  const response: HomeSummaryResponse = { customers, logs, team, schedules, open_sos };
  return json(200, response);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
