import type { AssignWorkerResponse, RoutingBoardResponse } from "@daya/shared";
import { api } from "./client";

export async function getRoutingBoard(): Promise<RoutingBoardResponse> {
  const { data } = await api.get<RoutingBoardResponse>("/routing");
  return data;
}

export async function assignWorker(workerId: string, customerId: string): Promise<AssignWorkerResponse> {
  const { data } = await api.post<AssignWorkerResponse>("/allocations", {
    worker_id: workerId,
    customer_id: customerId,
  });
  return data;
}

export async function unassignWorker(allocationId: string): Promise<void> {
  await api.delete(`/allocations/${allocationId}`);
}
