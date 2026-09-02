import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { ListUsersResponse } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { listDirectoryUsers } from "../lib/db";
import { handleError, json } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const response: ListUsersResponse = { users: await listDirectoryUsers() };
  return json(200, response);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
