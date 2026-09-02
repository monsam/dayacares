import type { HomeSummaryResponse } from "@daya/shared";
import { api } from "./client";

export async function getHomeSummary(): Promise<HomeSummaryResponse> {
  const { data } = await api.get<HomeSummaryResponse>("/home");
  return data;
}
