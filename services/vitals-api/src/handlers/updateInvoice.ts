import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { UpdateInvoiceRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { updateInvoice } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  await requireCaller(event, ["ADMIN"]);
  const invoiceId = event.pathParameters?.invoiceId;
  if (!invoiceId) {
    throw new HttpError(400, "invoiceId is required.");
  }
  return json(200, await updateInvoice(invoiceId, parseBody<UpdateInvoiceRequest>(event.body)));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
