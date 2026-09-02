import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SessionUser, UserRole } from "@daya/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { login } from "../api/auth";
import { clearSessionToken, persistSessionToken } from "../api/client";

const STORAGE_KEY = "daya.session";

export const ROLE_LABEL: Record<UserRole, string> = {
  WORKER: "Care Giver",
  CUSTOMER: "Care Focus",
  FAMILY: "Care Family",
  ADMIN: "Admin",
};

interface AuthContextValue {
  session: SessionUser | null;
  ready: boolean;
  signIn: (username: string, password: string) => Promise<SessionUser>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const account = JSON.parse(raw) as SessionUser & { token?: string };
          if (account.username && account.role && account.name) {
            await persistSessionToken(account.token ?? `demo:${account.username}`);
            setSession({
              user_id: account.user_id ?? `user-${account.username}`,
              username: account.username,
              role: account.role,
              name: account.name,
            });
          }
        } catch {
          await AsyncStorage.removeItem(STORAGE_KEY);
          await clearSessionToken();
        }
      }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const result = await login(username, password);
    await persistSessionToken(result.token);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...result.user, token: result.token }));
    setSession(result.user);
    return result.user;
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    AsyncStorage.removeItem(STORAGE_KEY);
    clearSessionToken();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      signIn,
      signOut,
    }),
    [ready, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
