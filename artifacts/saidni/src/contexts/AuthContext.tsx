import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import type { User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  isLoading: true,
  refreshUser: async () => {},
});

const STORAGE_KEY = "saidni_user";

function safeLocalStorage() {
  try {
    localStorage.setItem("__test__", "1");
    localStorage.removeItem("__test__");
    return localStorage;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshingRef = useRef(false);

  const setUser = (u: User | null) => {
    setUserState(u);
    try {
      const storage = safeLocalStorage();
      if (u) {
        storage?.setItem(STORAGE_KEY, JSON.stringify(u));
      } else {
        storage?.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  // Fetch fresh user data from the server and update state
  const refreshUser = async (): Promise<void> => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const freshUser: User = await res.json();
        setUser(freshUser);
      } else {
        // Session expired or invalid — clear stale localStorage data so the
        // user is sent back to login with the correct role after re-auth.
        setUser(null);
      }
    } catch {
      // Network error — keep cached data to avoid logout on flaky connection
    } finally {
      refreshingRef.current = false;
    }
  };

  useEffect(() => {
    // 1. Load from localStorage immediately so UI renders without flash
    try {
      const storage = safeLocalStorage();
      const stored = storage?.getItem(STORAGE_KEY);
      if (stored) {
        setUserState(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    // 2. Always fetch fresh data from server to get up-to-date isActive status
    refreshUser().finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
