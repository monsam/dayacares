import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { UpdateCareRecipientRequest } from "@daya/shared";
import { requireCaller } from "../lib/auth";
import { getCareRecipientForm, updateCareRecipient } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

export const getHandler: APIGatewayProxyHandler = async (event) => {
  try {
    await requireCaller(event, ["ADMIN"]);
    const customerId = event.pathParameters?.customerId;
    if (!customerId) throw new HttpError(400, "customerId is required.");
    return json(200, await getCareRecipientForm(customerId));
  } catch (error) {
    return handleError(error);
  }
};

export const patchHandler: APIGatewayProxyHandler = async (event) => {
  try {
    await requireCaller(event, ["ADMIN"]);
    const customerId = event.pathParameters?.customerId;
    if (!customerId) throw new HttpError(400, "customerId is required.");
    const body = parseBody<UpdateCareRecipientRequest>(event.body);
    if (!body.registration) throw new HttpError(400, "registration is required.");
    return json(200, await updateCareRecipient(customerId, body.registration));
  } catch (error) {
    return handleError(error);
  }
};
