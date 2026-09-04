import type { DunningResponse, GeneratePlanWeekResponse, OpsReportResponse } from "@daya/shared";
import { Platform } from "react-native";
import { api } from "./client";

export async function getOpsReport(from?: string, to?: string): Promise<OpsReportResponse> {
  const { data } = await api.get<OpsReportResponse>("/ops-report", { params: { from, to } });
  return data;
}

export async function generatePlanWeek(date: string): Promise<GeneratePlanWeekResponse> {
  const { data } = await api.post<GeneratePlanWeekResponse>("/schedules/plan-week", { date });
  return data;
}

export async function sendDunningReminders(): Promise<DunningResponse> {
  const { data } = await api.post<DunningResponse>("/billing/dunning");
  return data;
}

export async function downloadOpsPack(from?: string, to?: string) {
  const { data, headers } = await api.get<Blob>("/ops-report.csv", {
    params: { from, to },
    responseType: "blob",
  });
  if (Platform.OS !== "web") throw new Error("Export is available in the web app.");
  const disposition = String(headers["content-disposition"] ?? "");
  const match = disposition.match(/filename="([^"]+)"/);
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = match?.[1] ?? "daya-ops.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadReceipt(invoiceId: string) {
  const { data, headers } = await api.get<Blob>(`/invoices/${invoiceId}/receipt`, { responseType: "blob" });
  if (Platform.OS !== "web") throw new Error("Receipt download is available in the web app.");
  const disposition = String(headers["content-disposition"] ?? "");
  const match = disposition.match(/filename="([^"]+)"/);
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = match?.[1] ?? "receipt.pdf";
  link.click();
  URL.revokeObjectURL(url);
}
