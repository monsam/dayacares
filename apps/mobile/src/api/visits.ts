import type {
  CreateHealthVisitLogRequest,
  CreateHealthVisitLogResponse,
  GetHealthVisitLogResponse,
  HomeVisitSummary,
  ListHealthVisitLogsResponse,
  UpdateHealthVisitLogRequest,
} from "@daya/shared";
import { api } from "./client";

export async function createHealthVisitLog(
  payload: CreateHealthVisitLogRequest,
): Promise<CreateHealthVisitLogResponse> {
  const { data } = await api.post<CreateHealthVisitLogResponse>("/health-visit-logs", payload);
  return data;
}

export async function listVisitLogs(customerId?: string): Promise<HomeVisitSummary[]> {
  const { data } = await api.get<ListHealthVisitLogsResponse>("/health-visit-logs", {
    params: customerId ? { customer_id: customerId } : undefined,
  });
  return data.logs;
}

export async function getVisitLog(logId: string): Promise<HomeVisitSummary> {
  const { data } = await api.get<GetHealthVisitLogResponse>(`/health-visit-logs/${logId}`);
  return data.visit;
}

export async function updateHealthVisitLog(
  logId: string,
  payload: UpdateHealthVisitLogRequest,
): Promise<HomeVisitSummary> {
  const { data } = await api.patch<GetHealthVisitLogResponse>(`/health-visit-logs/${logId}`, payload);
  return data.visit;
}
