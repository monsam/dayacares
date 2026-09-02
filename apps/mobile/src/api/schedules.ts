import type {
  CreateScheduleRequest,
  ListSchedulesResponse,
  UpdateScheduleRequest,
  VisitSchedule,
} from "@daya/shared";
import { api } from "./client";

export async function listSchedules(date: string): Promise<ListSchedulesResponse> {
  const { data } = await api.get<ListSchedulesResponse>("/schedules", { params: { date } });
  return data;
}

export async function createSchedule(body: CreateScheduleRequest): Promise<VisitSchedule> {
  const { data } = await api.post<VisitSchedule>("/schedules", body);
  return data;
}

export async function updateSchedule(scheduleId: string, body: UpdateScheduleRequest): Promise<VisitSchedule> {
  const { data } = await api.patch<VisitSchedule>(`/schedules/${scheduleId}`, body);
  return data;
}
