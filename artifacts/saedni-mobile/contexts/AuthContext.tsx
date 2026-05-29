import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_KEY = "@saedni/user";

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  userType: "customer" | "helper" | "admin";
  isActive: boolean;
  isVerified?: boolean;
  isBlocked?: boolean;
  area?: string | null;
  helperInterests?: string | null;  // JSON-encoded string[]
  preferredAreas?: string | null;   // JSON-encoded string[]
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as AuthUser;
          setUserState(parsed);
          try {
            const base = process.env.EXPO_PUBLIC_DOMAIN
              ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
              : "";
            const res = await fetch(`${base}/api/auth/me`, { credentials: "include" });
            if (!res.ok) {
              await AsyncStorage.removeItem(AUTH_KEY);
              setUserState(null);
            } else {
              const fresh = (await res.json()) as AuthUser;
              await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(fresh));
              setUserState(fresh);
            }
          } catch {
            // keep stored user if offline
          }
        }
      } catch {
        // ignore storage errors
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setUser = async (u: AuthUser | null) => {
    if (u) {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u));
    } else {
      await AsyncStorage.removeItem(AUTH_KEY);
    }
    setUserState(u);
  };

  const logout = async () => {
    try {
      const base = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "";
      await fetch(`${base}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    await setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
