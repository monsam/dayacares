import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { CreateInvoiceRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { createInvoice } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const body = parseBody<CreateInvoiceRequest>(event.body);
  if (!body.customer_id) {
    throw new HttpError(400, "customer_id is required.");
  }
  return json(201, await createInvoice(body));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
