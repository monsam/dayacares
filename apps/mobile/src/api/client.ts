import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "daya.cognito.idToken";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3333",
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = Platform.OS === "web" ? localStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function demoTokenForUsername(username: string) {
  return `demo:${username}`;
}

export async function persistSessionToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearSessionToken() {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function detectEntrySource() {
  if (Platform.OS === "ios") return "IOS_APP" as const;
  if (Platform.OS === "android") return "ANDROID_APP" as const;
  return "WEB" as const;
}
