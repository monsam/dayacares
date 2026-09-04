import type { HomeSummaryResponse } from "@daya/shared";
import { localDateStamp } from "../lib/scheduleDisplay";
import { api } from "./client";

export async function getHomeSummary(): Promise<HomeSummaryResponse> {
  const { data } = await api.get<HomeSummaryResponse>("/home", {
    params: { date: localDateStamp() },
  });
  return data;
}
