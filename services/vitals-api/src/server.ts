import type { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Context } from "aws-lambda";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { config } from "./config";
import { handler as createHealthVisitLog } from "./handlers/createHealthVisitLog";
import { handler as getHomeSummary } from "./handlers/getHomeSummary";
import { handler as createCareRecipient } from "./handlers/createCareRecipient";
import { getCustomerHandler, listCustomersHandler } from "./handlers/listCustomers";
import { handler as listWorkers } from "./handlers/listWorkers";
import { handler as listUsers } from "./handlers/listUsers";
import { handler as createDirectoryUser } from "./handlers/createDirectoryUser";
import { handler as updateDirectoryUser } from "./handlers/updateDirectoryUser";
import { handler as deleteDirectoryUser } from "./handlers/deleteDirectoryUser";
import { handler as getHealthVisitLog } from "./handlers/getHealthVisitLog";
import { handler as listHealthVisitLogs } from "./handlers/listHealthVisitLogs";
import { handler as getRoutingBoard } from "./handlers/getRoutingBoard";
import { handler as assignWorker } from "./handlers/assignWorker";
import { handler as unassignWorker } from "./handlers/unassignWorker";
import { handler as listSchedules } from "./handlers/listSchedules";
import { handler as createSchedule } from "./handlers/createSchedule";
import { handler as updateSchedule } from "./handlers/updateSchedule";
import { handler as getBillingBoard } from "./handlers/getBillingBoard";
import { handler as createInvoice } from "./handlers/createInvoice";
import { handler as updateInvoice } from "./handlers/updateInvoice";
import { handler as updateSubscription } from "./handlers/updateSubscription";
import { handler as listSos } from "./handlers/listSos";
import { handler as createSos } from "./handlers/createSos";
import { handler as updateSos } from "./handlers/updateSos";
import { handler as login } from "./handlers/login";
import { handler as getMe } from "./handlers/getMe";
import { handler as updateMe } from "./handlers/updateMe";
import { handler as listNotifications } from "./handlers/listNotifications";
import { handler as getNotification } from "./handlers/getNotification";
import { handler as updateNotification } from "./handlers/updateNotification";
import { blankForm, filledForm, listForms } from "./handlers/downloadForm";
import { requireCaller } from "./lib/auth";
import { backfillDefaultPasswords } from "./lib/db";
import { HttpError } from "./lib/http";
import { pingDatabase, pool } from "./lib/mysql";
import { backfillNotifications, ensureNotificationsTable } from "./lib/notifications";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function toEvent(
  req: Request,
  extras: {
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
  } = {},
): APIGatewayProxyEvent {
  return {
    body: req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : null,
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(",") : (value ?? ""),
      ]),
    ),
    multiValueHeaders: {},
    httpMethod: req.method,
    isBase64Encoded: false,
    path: req.path,
    pathParameters: extras.pathParameters ?? null,
    queryStringParameters:
      extras.queryStringParameters ??
      Object.fromEntries(
        Object.entries(req.query).flatMap(([key, value]) => {
          if (typeof value === "string") return [[key, value]];
          if (Array.isArray(value) && typeof value[0] === "string") return [[key, value[0]]];
          return [];
        }),
      ),
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: req.path,
    requestContext: {
      accountId: "local",
      apiId: "local",
      authorizer: {},
      protocol: "HTTP/1.1",
      httpMethod: req.method,
      identity: {} as APIGatewayProxyEvent["requestContext"]["identity"],
      path: req.path,
      stage: "local",
      requestId: "local",
      requestTimeEpoch: Date.now(),
      resourceId: "local",
      resourcePath: req.path,
    },
  };
}

const emptyContext = {} as Context;

async function invoke(handler: APIGatewayProxyHandler, event: APIGatewayProxyEvent) {
  const result = await handler(event, emptyContext, () => undefined);
  if (!result) {
    throw new Error("Handler did not return a response.");
  }
  return result;
}

async function send(res: Response, result: APIGatewayProxyResult) {
  res.status(result.statusCode);
  for (const [key, value] of Object.entries(result.headers ?? {})) {
    res.setHeader(key, String(value));
  }
  res.send(result.body);
}

app.post("/auth/login", async (req, res) => {
  await send(res, await invoke(login, toEvent(req)));
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "mysql" });
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: error instanceof Error ? error.message : "Database unavailable",
    });
  }
});

app.get("/home", async (req, res) => {
  await send(res, await invoke(getHomeSummary, toEvent(req)));
});

app.get("/customers", async (req, res) => {
  await send(res, await invoke(listCustomersHandler, toEvent(req)));
});

app.post("/customers", async (req, res) => {
  await send(res, await invoke(createCareRecipient, toEvent(req)));
});

app.get("/workers", async (req, res) => {
  await send(res, await invoke(listWorkers, toEvent(req)));
});

app.get("/me", async (req, res) => {
  await send(res, await invoke(getMe, toEvent(req)));
});

app.patch("/me", async (req, res) => {
  await send(res, await invoke(updateMe, toEvent(req)));
});

app.get("/notifications", async (req, res) => {
  await send(res, await invoke(listNotifications, toEvent(req)));
});

app.get("/notifications/:notificationId", async (req, res) => {
  await send(
    res,
    await invoke(getNotification, toEvent(req, { pathParameters: { notificationId: req.params.notificationId } })),
  );
});

app.patch("/notifications/:notificationId", async (req, res) => {
  await send(
    res,
    await invoke(updateNotification, toEvent(req, { pathParameters: { notificationId: req.params.notificationId } })),
  );
});

app.get("/users", async (req, res) => {
  await send(res, await invoke(listUsers, toEvent(req)));
});

app.post("/users", async (req, res) => {
  await send(res, await invoke(createDirectoryUser, toEvent(req)));
});

app.patch("/users/:userId", async (req, res) => {
  await send(
    res,
    await invoke(updateDirectoryUser, toEvent(req, { pathParameters: { userId: req.params.userId } })),
  );
});

app.delete("/users/:userId", async (req, res) => {
  await send(
    res,
    await invoke(deleteDirectoryUser, toEvent(req, { pathParameters: { userId: req.params.userId } })),
  );
});

app.get("/routing", async (req, res) => {
  await send(res, await invoke(getRoutingBoard, toEvent(req)));
});

app.post("/allocations", async (req, res) => {
  await send(res, await invoke(assignWorker, toEvent(req)));
});

app.delete("/allocations/:allocationId", async (req, res) => {
  await send(
    res,
    await invoke(unassignWorker, toEvent(req, { pathParameters: { allocationId: req.params.allocationId } })),
  );
});

app.get("/schedules", async (req, res) => {
  await send(res, await invoke(listSchedules, toEvent(req)));
});

app.post("/schedules", async (req, res) => {
  await send(res, await invoke(createSchedule, toEvent(req)));
});

app.patch("/schedules/:scheduleId", async (req, res) => {
  await send(
    res,
    await invoke(updateSchedule, toEvent(req, { pathParameters: { scheduleId: req.params.scheduleId } })),
  );
});

app.get("/billing", async (req, res) => {
  await send(res, await invoke(getBillingBoard, toEvent(req)));
});

app.post("/invoices", async (req, res) => {
  await send(res, await invoke(createInvoice, toEvent(req)));
});

app.patch("/invoices/:invoiceId", async (req, res) => {
  await send(
    res,
    await invoke(updateInvoice, toEvent(req, { pathParameters: { invoiceId: req.params.invoiceId } })),
  );
});

app.patch("/customers/:customerId/subscription", async (req, res) => {
  await send(
    res,
    await invoke(updateSubscription, toEvent(req, { pathParameters: { customerId: req.params.customerId } })),
  );
});

app.get("/sos", async (req, res) => {
  await send(res, await invoke(listSos, toEvent(req)));
});

app.post("/sos", async (req, res) => {
  await send(res, await invoke(createSos, toEvent(req)));
});

app.patch("/sos/:incidentId", async (req, res) => {
  await send(
    res,
    await invoke(updateSos, toEvent(req, { pathParameters: { incidentId: req.params.incidentId } })),
  );
});

app.get("/customers/:customerId", async (req, res) => {
  await send(
    res,
    await invoke(getCustomerHandler, toEvent(req, { pathParameters: { customerId: req.params.customerId } })),
  );
});

app.get("/health-visit-logs", async (req, res) => {
  await send(res, await invoke(listHealthVisitLogs, toEvent(req)));
});

app.get("/health-visit-logs/:logId", async (req, res) => {
  await send(
    res,
    await invoke(getHealthVisitLog, toEvent(req, { pathParameters: { logId: req.params.logId } })),
  );
});

app.post("/health-visit-logs", async (req, res) => {
  await send(res, await invoke(createHealthVisitLog, toEvent(req)));
});

function sendPdf(res: Response, filename: string, bytes: Uint8Array | Buffer) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(bytes));
}

app.get("/forms", async (req, res) => {
  try {
    await requireCaller(toEvent(req), ["ADMIN", "WORKER", "FAMILY", "CUSTOMER"]);
    res.json(listForms());
  } catch (error) {
    const status = error instanceof HttpError ? error.statusCode : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : "Could not list forms." });
  }
});

app.get("/forms/:kind/blank", async (req, res) => {
  try {
    await requireCaller(toEvent(req), ["ADMIN", "WORKER", "FAMILY", "CUSTOMER"]);
    const file = blankForm(req.params.kind);
    sendPdf(res, file.filename, file.bytes);
  } catch (error) {
    const status = error instanceof HttpError ? error.statusCode : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : "Could not download the blank form." });
  }
});

app.get("/forms/:kind", async (req, res) => {
  try {
    const file = await filledForm(toEvent(req), req.params.kind);
    sendPdf(res, file.filename, file.bytes);
  } catch (error) {
    const status = error instanceof HttpError ? error.statusCode : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : "Could not prefill this form." });
  }
});

const server = app.listen(config.port, async () => {
  try {
    await pingDatabase();
    const hashed = await backfillDefaultPasswords();
    if (hashed) {
      console.log(`Set the default login password on ${hashed} existing MySQL users.`);
    }
    await ensureNotificationsTable();
    const seeded = await backfillNotifications();
    if (seeded) {
      console.log(`Created ${seeded} in-app notifications from existing SOS and visit alerts.`);
    }
    console.log(`Daya API listening on http://127.0.0.1:${config.port} (MySQL ${config.mysql.host}:${config.mysql.port}/${config.mysql.database})`);
  } catch (error) {
    console.error("MySQL is not reachable. Start it with: docker compose up -d mysql", error);
    server.close();
    process.exit(1);
  }
});
