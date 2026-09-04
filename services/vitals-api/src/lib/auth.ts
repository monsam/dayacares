import type { APIGatewayProxyEvent } from "aws-lambda";
import type { User, UserRole } from "@daya/shared";
import { getUserByCognitoSub } from "./db";
import { HttpError } from "./http";

export const ALL_ROLES: UserRole[] = ["WORKER", "FAMILY", "CUSTOMER", "ADMIN"];

export interface AuthenticatedCaller {
  cognito_sub: string;
  user_id?: string;
  role: UserRole;
  full_name?: string;
}

function header(event: APIGatewayProxyEvent, name: string): string {
  const headers = event.headers ?? {};
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return String(match?.[1] ?? "");
}

function readClaims(event: APIGatewayProxyEvent): Record<string, unknown> {
  const authorizer = event.requestContext.authorizer as
    | { claims?: Record<string, unknown>; jwt?: { claims?: Record<string, unknown> } }
    | undefined;

  return authorizer?.jwt?.claims ?? authorizer?.claims ?? {};
}

function bearerToken(event: APIGatewayProxyEvent): string {
  return header(event, "authorization").replace(/^Bearer\s+/i, "");
}

export async function requireCaller(
  event: APIGatewayProxyEvent,
  allowed: UserRole[],
): Promise<AuthenticatedCaller> {
  const token = bearerToken(event);

  if (token.startsWith("demo:")) {
    const user = await getUserByCognitoSub(token);
    if (!user) {
      throw new HttpError(401, "Unknown demo account.");
    }
    if (user.account_status === "BLOCKED") {
      throw new HttpError(403, "This account is blocked.");
    }
    if (!allowed.includes(user.role)) {
      throw new HttpError(403, `Role ${user.role} is not permitted for this action.`);
    }
    return {
      cognito_sub: user.cognito_sub,
      user_id: user.user_id,
      role: user.role,
      full_name: user.full_name,
    };
  }

  const claims = readClaims(event);
  const role = String(claims["custom:user_role"] ?? claims.role ?? "") as UserRole;
  const cognitoSub = String(claims.sub ?? "");

  if (!cognitoSub) {
    throw new HttpError(401, "Missing Cognito identity.");
  }

  if (!allowed.includes(role)) {
    throw new HttpError(403, `Role ${role || "UNKNOWN"} is not permitted for this action.`);
  }

  return {
    cognito_sub: cognitoSub,
    user_id: typeof claims.user_id === "string" ? claims.user_id : undefined,
    role,
    full_name: typeof claims.name === "string" ? claims.name : undefined,
  };
}

export async function requireUser(
  event: APIGatewayProxyEvent,
  allowed: UserRole[] = ALL_ROLES,
): Promise<User> {
  const caller = await requireCaller(event, allowed);
  const user = await getUserByCognitoSub(caller.cognito_sub);
  if (!user) {
    throw new HttpError(403, "User profile is not provisioned.");
  }
  return user;
}
