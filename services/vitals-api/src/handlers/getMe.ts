import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { requireUser } from "../lib/auth";
import { getDirectoryUser } from "../lib/db";
import { handleError, json } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  const user = await requireUser(event);
  return json(200, await getDirectoryUser(user.user_id));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
