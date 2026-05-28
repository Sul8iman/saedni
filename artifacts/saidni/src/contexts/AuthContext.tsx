import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  isLoading: true,
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

  useEffect(() => {
    try {
      const storage = safeLocalStorage();
      const stored = storage?.getItem(STORAGE_KEY);
      if (stored) {
        setUserState(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

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

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
