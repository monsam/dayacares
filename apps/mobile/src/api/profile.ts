import type { DirectoryUser, UpdateOwnProfileRequest } from "@daya/shared";
import { api } from "./client";

export async function getProfile(): Promise<DirectoryUser> {
  const { data } = await api.get<DirectoryUser>("/me");
  return data;
}

export async function updateProfile(body: UpdateOwnProfileRequest): Promise<DirectoryUser> {
  const { data } = await api.patch<DirectoryUser>("/me", body);
  return data;
}
