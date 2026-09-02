import type {
  CareRecipientRegistration,
  CreateCareRecipientResponse,
  CustomerSummary,
  ListCustomersResponse,
  ListWorkersResponse,
  WorkerSummary,
} from "@daya/shared";
import { api } from "./client";

export async function listCustomers(): Promise<CustomerSummary[]> {
  const { data } = await api.get<ListCustomersResponse>("/customers");
  return data.customers;
}

export async function getCustomer(customerId: string): Promise<CustomerSummary> {
  const { data } = await api.get<CustomerSummary>(`/customers/${customerId}`);
  return data;
}

export async function createCareRecipient(
  registration: CareRecipientRegistration,
): Promise<CreateCareRecipientResponse> {
  const { data } = await api.post<CreateCareRecipientResponse>("/customers", { registration });
  return data;
}

export async function listWorkers(): Promise<WorkerSummary[]> {
  const { data } = await api.get<ListWorkersResponse>("/workers");
  return data.workers;
}
