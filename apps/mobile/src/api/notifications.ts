import type { AppNotification, ListNotificationsResponse } from "@daya/shared";
import { api } from "./client";

export async function listNotifications(): Promise<ListNotificationsResponse> {
  const { data } = await api.get<ListNotificationsResponse>("/notifications");
  return data;
}

export async function getNotification(notificationId: string): Promise<AppNotification> {
  const { data } = await api.get<AppNotification>(`/notifications/${notificationId}`);
  return data;
}

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  const { data } = await api.patch<AppNotification>(`/notifications/${notificationId}`, { read: true });
  return data;
}
