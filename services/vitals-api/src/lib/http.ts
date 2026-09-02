import type { APIGatewayProxyResult } from "aws-lambda";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Content-Type": "application/json",
};

export function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

export function parseBody<T>(raw: string | null): T {
  if (!raw) {
    throw new HttpError(400, "Request body is required.");
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function handleError(error: unknown): APIGatewayProxyResult {
  if (error instanceof HttpError) {
    return json(error.statusCode, {
      error: error.message,
      details: error.details,
    });
  }

  console.error("Unhandled handler error", error);
  return json(500, { error: "Internal server error." });
}
