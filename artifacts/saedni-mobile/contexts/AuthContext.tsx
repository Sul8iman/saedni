import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";

const TOKEN_KEY = "@saedni/authToken";
const USER_KEY  = "@saedni/user";

const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

// SecureStore with AsyncStorage fallback
async function secureGet(key: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(key); }
  catch { try { return await AsyncStorage.getItem(key); } catch { return null; } }
}

async function secureSet(key: string, value: string): Promise<void> {
  try { await SecureStore.setItemAsync(key, value); return; } catch {}
  try { await AsyncStorage.setItem(key, value); } catch {}
}

async function secureDelete(key: string): Promise<void> {
  try { await SecureStore.deleteItemAsync(key); } catch {}
  try { await AsyncStorage.removeItem(key); } catch {}
}

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

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  /** Save user + token after login. Use this in all login flows. */
  setSession: (user: AuthUser, token: string) => Promise<void>;
  /** Update local user state without touching the token (e.g. preference saves). */
  setUser: (user: AuthUser | null) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setSession: async () => {},
  setUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          secureGet(TOKEN_KEY),
          secureGet(USER_KEY),
        ]);

        // Show stored user immediately for a snappy launch
        if (storedUser) {
          try { setUserState(JSON.parse(storedUser) as AuthUser); } catch {}
        }

        if (storedToken && BASE) {
          try {
            const res = await fetch(`${BASE}/api/auth/me`, {
              credentials: "include",
              headers: { Authorization: `Bearer ${storedToken}` },
            });

            if (res.ok) {
              // Refresh user data from server
              const fresh = (await res.json()) as AuthUser;
              await secureSet(USER_KEY, JSON.stringify(fresh));
              setUserState(fresh);
            } else if (res.status === 403) {
              // Account disabled
              await secureDelete(TOKEN_KEY);
              await secureDelete(USER_KEY);
              setUserState(null);
              Alert.alert(
                "الحساب معطّل",
                "تم تعطيل حسابك، يرجى التواصل مع الإدارة",
                [{ text: "حسناً" }],
              );
            } else {
              // Token invalid (401) — clear and force re-login
              await secureDelete(TOKEN_KEY);
              await secureDelete(USER_KEY);
              setUserState(null);
            }
          } catch {
            // Network error — keep stored user (offline support)
          }
        } else if (!storedToken) {
          // No token stored — ensure user state is cleared
          await secureDelete(USER_KEY);
          setUserState(null);
        }
      } catch {
        // Ignore storage errors
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** Called after successful login/OTP — persists both user and token. */
  const setSession = async (u: AuthUser, token: string) => {
    await Promise.all([
      secureSet(TOKEN_KEY, token),
      secureSet(USER_KEY, JSON.stringify(u)),
    ]);
    setUserState(u);
  };

  /**
   * Updates user state in storage.
   * - Pass null to clear (legacy logout path).
   * - Pass a user object to update local preferences without touching the token.
   */
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
    <AuthContext.Provider value={{ user, loading, setSession, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
