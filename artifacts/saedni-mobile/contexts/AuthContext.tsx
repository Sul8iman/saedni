import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

const TOKEN_KEY = "@saedni/authToken";
const USER_KEY  = "@saedni/user";

const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

// ─── SecureStore with AsyncStorage fallback ──────────────────────────────────

async function secureGet(key: string): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(key);
    return val;
  } catch {
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  }
}

async function secureSet(key: string, value: string): Promise<boolean> {
  if (value === undefined || value === null) {
    console.warn("[AuthContext] secureSet called with null/undefined for key:", key);
    return false;
  }
  // Try SecureStore first (encrypted keychain)
  try {
    await SecureStore.setItemAsync(key, value);
    // Verify the write succeeded
    const check = await SecureStore.getItemAsync(key);
    if (check === value) return true;
  } catch {
    // Fall through to AsyncStorage
  }
  // Fallback: AsyncStorage
  try {
    await AsyncStorage.setItem(key, value);
    const check = await AsyncStorage.getItem(key);
    return check === value;
  } catch {
    return false;
  }
}

async function secureDelete(key: string): Promise<void> {
  try { await SecureStore.deleteItemAsync(key); } catch {}
  try { await AsyncStorage.removeItem(key); } catch {}
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  userType: "customer" | "helper" | "admin";
  isActive: boolean;
  isVerified?: boolean;
  isBlocked?: boolean;
  area?: string | null;
  helperInterests?: string | null;
  preferredAreas?: string | null;
}

export interface StartupLog {
  domain: string;
  tokenFound: boolean;
  tokenPreview: string;
  meStatus: number | "network-error" | "not-checked";
  userRestored: boolean;
  storageBackend: "SecureStore" | "AsyncStorage" | "none";
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  startupLog: StartupLog | null;
  /** Save user + token after login. */
  setSession: (user: AuthUser, token: string) => Promise<void>;
  /** Update local user state without touching the token (preference saves). */
  setUser: (user: AuthUser | null) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  startupLog: null,
  setSession: async () => {},
  setUser: async () => {},
  logout: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupLog, setStartupLog] = useState<StartupLog | null>(null);

  useEffect(() => {
    (async () => {
      const log: StartupLog = {
        domain: BASE || "(empty — EXPO_PUBLIC_DOMAIN not set)",
        tokenFound: false,
        tokenPreview: "—",
        meStatus: "not-checked",
        userRestored: false,
        storageBackend: "none",
      };

      try {
        const [storedToken, storedUser] = await Promise.all([
          secureGet(TOKEN_KEY),
          secureGet(USER_KEY),
        ]);

        log.tokenFound = !!storedToken;
        log.tokenPreview = storedToken ? storedToken.substring(0, 8) + "…" : "—";

        // Show stored user immediately for a snappy launch
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser) as AuthUser;
            setUserState(parsed);
            log.userRestored = true;
          } catch {}
        }

        if (storedToken && BASE) {
          try {
            const res = await fetch(`${BASE}/api/auth/me`, {
              credentials: "include",
              headers: { Authorization: `Bearer ${storedToken}` },
            });

            log.meStatus = res.status;

            if (res.ok) {
              const fresh = (await res.json()) as AuthUser;
              await secureSet(USER_KEY, JSON.stringify(fresh));
              setUserState(fresh);
              log.userRestored = true;
            } else if (res.status === 403) {
              await secureDelete(TOKEN_KEY);
              await secureDelete(USER_KEY);
              setUserState(null);
              log.userRestored = false;
              Alert.alert(
                "الحساب معطّل",
                "تم تعطيل حسابك، يرجى التواصل مع الإدارة",
                [{ text: "حسناً" }],
              );
            } else {
              // 401 or other — token is invalid
              await secureDelete(TOKEN_KEY);
              await secureDelete(USER_KEY);
              setUserState(null);
              log.userRestored = false;
            }
          } catch (err) {
            // Network error — keep stored user for offline use
            log.meStatus = "network-error";
            console.warn("[AuthContext] /auth/me network error:", err);
          }
        } else if (!storedToken) {
          await secureDelete(USER_KEY);
          setUserState(null);
        }

        // Determine which backend actually has the token
        if (storedToken) {
          try {
            const ssVal = await SecureStore.getItemAsync(TOKEN_KEY);
            log.storageBackend = ssVal ? "SecureStore" : "AsyncStorage";
          } catch {
            log.storageBackend = "AsyncStorage";
          }
        }
      } catch (err) {
        console.error("[AuthContext] startup error:", err);
      } finally {
        setStartupLog(log);
        setLoading(false);
        console.log("[AuthContext] startup complete:", JSON.stringify(log));
      }
    })();
  }, []);

  const setSession = async (u: AuthUser, token: string) => {
    if (!token || !u) {
      console.error("[AuthContext] setSession: missing token or user", { token, u });
      Alert.alert("خطأ", "لم يتم استلام رمز الدخول من الخادم. يرجى المحاولة مجدداً.");
      return;
    }

    const tokenOk = await secureSet(TOKEN_KEY, token);
    const userOk  = await secureSet(USER_KEY, JSON.stringify(u));

    console.log("[AuthContext] setSession — token saved:", tokenOk, "user saved:", userOk,
      "token preview:", token.substring(0, 8) + "…");

    if (!tokenOk) {
      console.error("[AuthContext] setSession: token write FAILED (both SecureStore and AsyncStorage)");
    }

    setUserState(u);
  };

  const setUser = async (u: AuthUser | null) => {
    if (u === null) {
      await secureDelete(TOKEN_KEY);
      await secureDelete(USER_KEY);
      setUserState(null);
    } else {
      await secureSet(USER_KEY, JSON.stringify(u));
      setUserState(u);
    }
  };

  const logout = async () => {
    try {
      const token = await secureGet(TOKEN_KEY);
      if (token && BASE) {
        await fetch(`${BASE}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    await secureDelete(TOKEN_KEY);
    await secureDelete(USER_KEY);
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, startupLog, setSession, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
