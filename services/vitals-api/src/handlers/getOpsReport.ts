import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { requireCaller } from "../lib/auth";
import { handleError, json } from "../lib/http";
import { getOpsReport, opsReportCsv } from "../lib/ops";

export const jsonHandler: APIGatewayProxyHandler = async (event) => {
  try {
    await requireCaller(event, ["ADMIN"]);
    return json(
      200,
      await getOpsReport(event.queryStringParameters?.from, event.queryStringParameters?.to),
    );
  } catch (error) {
    return handleError(error);
  }
};

export const csvHandler: APIGatewayProxyHandler = async (event) => {
  try {
    await requireCaller(event, ["ADMIN"]);
    const report = await getOpsReport(event.queryStringParameters?.from, event.queryStringParameters?.to);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="daya-ops-${report.date_from}-${report.date_to}.csv"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition",
      },
      body: opsReportCsv(report),
    };
  } catch (error) {
    return handleError(error);
  }
};
