import type { LoginResponse } from "@daya/shared";
import { api } from "./client";

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", { username, password });
  return data;
}
