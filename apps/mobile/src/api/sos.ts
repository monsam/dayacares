import type { CreateSosRequest, ListSosResponse, SosIncident, UpdateSosRequest } from "@daya/shared";
import { api } from "./client";

export async function listSos(): Promise<SosIncident[]> {
  const { data } = await api.get<ListSosResponse>("/sos");
  return data.incidents;
}

export async function createSos(body: CreateSosRequest = {}): Promise<SosIncident> {
  const { data } = await api.post<SosIncident>("/sos", body);
  return data;
}

export async function updateSos(incidentId: string, body: UpdateSosRequest): Promise<SosIncident> {
  const { data } = await api.patch<SosIncident>(`/sos/${incidentId}`, body);
  return data;
}
