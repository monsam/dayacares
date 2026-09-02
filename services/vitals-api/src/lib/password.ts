import bcrypt from "bcryptjs";
import { config } from "../config";

export function defaultLoginPassword() {
  return config.defaultLoginPassword;
}

export async function hashPassword(plain: string) {
  const trimmed = plain.trim();
  if (trimmed.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  return bcrypt.hash(trimmed, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
