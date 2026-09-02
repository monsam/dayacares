import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { AssignWorkerRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { assignWorker } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const body = parseBody<AssignWorkerRequest>(event.body);
  if (!body.worker_id || !body.customer_id) {
    throw new HttpError(400, "worker_id and customer_id are required.");
  }
  return json(201, await assignWorker(body.worker_id, body.customer_id));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
