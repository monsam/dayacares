import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import type { UpdateOwnProfileRequest } from "@daya/shared";
import { requireUser } from "../lib/auth";
import { updateDirectoryUser } from "../lib/db";
import { handleError, HttpError, json, parseBody } from "../lib/http";

async function handle(event: APIGatewayProxyEvent) {
  const user = await requireUser(event);
  const body = parseBody<UpdateOwnProfileRequest>(event.body);
  if (body.password?.trim() && body.password.trim().length < 6) {
    throw new HttpError(400, "Password must be at least 6 characters.");
  }
  if (body.email?.trim() && !body.email.includes("@")) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  return json(
    200,
    await updateDirectoryUser(
      user.user_id,
      {
        full_name: body.full_name,
        phone_number: body.phone_number,
        email: body.email,
        password: body.password,
        address: user.role === "CUSTOMER" ? body.address : undefined,
      },
      user.user_id,
    ),
  );
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    return await handle(event);
  } catch (error) {
    return handleError(error);
  }
};
