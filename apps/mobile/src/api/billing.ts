import type {
  BillingBoardResponse,
  CreateInvoiceRequest,
  MembershipInvoice,
  SubscriptionStatus,
  UpdateInvoiceRequest,
} from "@daya/shared";
import { api } from "./client";

export async function getBillingBoard(): Promise<BillingBoardResponse> {
  const { data } = await api.get<BillingBoardResponse>("/billing");
  return data;
}

export async function createInvoice(body: CreateInvoiceRequest): Promise<MembershipInvoice> {
  const { data } = await api.post<MembershipInvoice>("/invoices", body);
  return data;
}

export async function updateInvoice(invoiceId: string, body: UpdateInvoiceRequest): Promise<MembershipInvoice> {
  const { data } = await api.patch<MembershipInvoice>(`/invoices/${invoiceId}`, body);
  return data;
}

export async function updateSubscription(customerId: string, subscription_status: SubscriptionStatus): Promise<void> {
  await api.patch(`/customers/${customerId}/subscription`, { subscription_status });
}
