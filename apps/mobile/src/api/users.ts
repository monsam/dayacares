import type {
  CreateDirectoryUserRequest,
  CreateDirectoryUserResponse,
  DirectoryUser,
  ListUsersResponse,
  UpdateDirectoryUserRequest,
} from "@daya/shared";
import { api } from "./client";

export async function listUsers(): Promise<DirectoryUser[]> {
  const { data } = await api.get<ListUsersResponse>("/users");
  return data.users;
}

export async function createUser(body: CreateDirectoryUserRequest): Promise<CreateDirectoryUserResponse> {
  const { data } = await api.post<CreateDirectoryUserResponse>("/users", body);
  return data;
}

export async function updateUser(userId: string, body: UpdateDirectoryUserRequest): Promise<DirectoryUser> {
  const { data } = await api.patch<DirectoryUser>(`/users/${userId}`, body);
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`);
}
