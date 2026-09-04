import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireCaller } from "../lib/auth";
import { handleError, json } from "../lib/http";
import { sendDunningReminders } from "../lib/ops";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    await requireCaller(event, ["ADMIN"]);
    return json(200, await sendDunningReminders());
  } catch (error) {
    return handleError(error);
  }
};
