import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { requireCaller } from "../lib/auth";
import { getRoutingBoard } from "../lib/db";
import { handleError, json } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  return json(200, await getRoutingBoard());
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
