import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

const TOKEN_KEY = "@saedni/authToken";
const USER_KEY  = "@saedni/user";

export const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

// ─── Storage: always write to BOTH stores, always read from both ─────────────

export interface StorageResult {
  ssWrite: boolean;
  asWrite: boolean;
  ssRead: boolean;
  asRead: boolean;
}

/**
 * Write value to BOTH SecureStore (encrypted keychain) and AsyncStorage.
 * This makes reads resilient — if one store fails on retrieval the other has it.
 */
export async function secureSet(key: string, value: string): Promise<StorageResult> {
  const result: StorageResult = { ssWrite: false, asWrite: false, ssRead: false, asRead: false };

  if (!value) {
    console.warn("[storage] secureSet called with empty value for", key);
    return result;
  }

  // Write to SecureStore
  try {
    await SecureStore.setItemAsync(key, value);
    result.ssWrite = true;
    // Verify read-back
    const check = await SecureStore.getItemAsync(key);
    result.ssRead = check === value;
  } catch (e) {
    console.warn("[storage] SecureStore write failed:", e);
  }

  // ALWAYS write to AsyncStorage as well (dual-write for resilience)
  try {
    await AsyncStorage.setItem(key, value);
    result.asWrite = true;
    const check = await AsyncStorage.getItem(key);
    result.asRead = check === value;
  } catch (e) {
    console.warn("[storage] AsyncStorage write failed:", e);
  }

  console.log(`[storage] secureSet(${key.slice(-12)}): SS_write=${result.ssWrite} SS_read=${result.ssRead} AS_write=${result.asWrite} AS_read=${result.asRead}`);
  return result;
}

/**
 * Read from SecureStore; if null/missing, ALWAYS fall through to AsyncStorage.
 * SecureStore.getItemAsync returns null (not throws) for missing keys,
 * so the old catch-only fallback never ran. This version checks both explicitly.
 */
export async function secureGet(key: string): Promise<string | null> {
  // Try SecureStore
  let ssVal: string | null = null;
  try {
    ssVal = await SecureStore.getItemAsync(key);
  } catch (e) {
    console.warn("[storage] SecureStore read error:", e);
  }
  if (ssVal != null) {
    console.log(`[storage] secureGet(${key.slice(-12)}): found in SecureStore`);
    return ssVal;
  }

  // Explicitly fall through to AsyncStorage regardless of whether SS threw or returned null
  try {
    const asVal = await AsyncStorage.getItem(key);
    if (asVal != null) {
      console.log(`[storage] secureGet(${key.slice(-12)}): found in AsyncStorage (SecureStore was empty)`);
    } else {
      console.log(`[storage] secureGet(${key.slice(-12)}): not found in either store`);
    }
    return asVal;
  } catch {
    return null;
  }
}

export async function secureDelete(key: string): Promise<void> {
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
  storageBackend: "SecureStore" | "AsyncStorage" | "both" | "none";
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  startupLog: StartupLog | null;
  setSession: (user: AuthUser, token: string) => Promise<StorageResult | null>;
  setUser: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  startupLog: null,
  setSession: async () => null,
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
      console.log("[AuthContext] startup check begin, BASE =", BASE || "(empty!)");

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

        console.log("[AuthContext] storedToken:", storedToken ? storedToken.substring(0, 8) + "…" : "null");
        console.log("[AuthContext] storedUser:", storedUser ? storedUser.substring(0, 30) + "…" : "null");

        log.tokenFound = !!storedToken;
        log.tokenPreview = storedToken ? storedToken.substring(0, 8) + "…" : "—";

        // Determine which backend has the token
        if (storedToken) {
          let ssHas = false;
          let asHas = false;
          try { ssHas = (await SecureStore.getItemAsync(TOKEN_KEY)) != null; } catch {}
          try { asHas = (await AsyncStorage.getItem(TOKEN_KEY)) != null; } catch {}
          log.storageBackend = ssHas && asHas ? "both" : ssHas ? "SecureStore" : asHas ? "AsyncStorage" : "none";
        }

        // Show cached user immediately for fast launch
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser) as AuthUser;
            setUserState(parsed);
            log.userRestored = true;
          } catch (e) {
            console.warn("[AuthContext] Failed to parse stored user:", e);
          }
        }

        if (storedToken && BASE) {
          try {
            console.log("[AuthContext] Calling /auth/me with token…");
            const res = await fetch(`${BASE}/api/auth/me`, {
              credentials: "include",
              headers: { Authorization: `Bearer ${storedToken}` },
            });

            log.meStatus = res.status;
            console.log("[AuthContext] /auth/me status:", res.status);

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
              Alert.alert("الحساب معطّل", "تم تعطيل حسابك، يرجى التواصل مع الإدارة", [{ text: "حسناً" }]);
            } else {
              // 401 — token invalid (could be overwritten by another login)
              console.warn("[AuthContext] /auth/me returned", res.status, "— clearing stored token");
              await secureDelete(TOKEN_KEY);
              await secureDelete(USER_KEY);
              setUserState(null);
              log.userRestored = false;
            }
          } catch (err) {
            // Network error — keep the cached user so the app still works offline
            log.meStatus = "network-error";
            console.warn("[AuthContext] /auth/me network error:", err);
          }
        } else if (!storedToken) {
          console.log("[AuthContext] No stored token — clearing user cache");
          await secureDelete(USER_KEY);
          setUserState(null);
        } else if (!BASE) {
          console.error("[AuthContext] EXPO_PUBLIC_DOMAIN is not set — cannot validate token");
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

  /** Save user + token after login. Returns storage write results for debug display. */
  const setSession = async (u: AuthUser, token: string): Promise<StorageResult | null> => {
    if (!token || !u) {
      console.error("[AuthContext] setSession: missing token or user");
      Alert.alert("خطأ", "لم يتم استلام رمز الدخول من الخادم. يرجى المحاولة مجدداً.");
      return null;
    }

    console.log("[AuthContext] setSession: saving token", token.substring(0, 8) + "…");
    const tokenResult = await secureSet(TOKEN_KEY, token);
    await secureSet(USER_KEY, JSON.stringify(u));

    console.log("[AuthContext] setSession complete:", JSON.stringify(tokenResult));
    setUserState(u);
    return tokenResult;
  };

  /** Update user profile without touching the token. */
  const setUser = async (u: AuthUser) => {
    await secureSet(USER_KEY, JSON.stringify(u));
    setUserState(u);
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
