import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiClient } from "../api";
import { authSession, type AuthUser } from "./authSession";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  permissions: string[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    authSession
      .refresh()
      .then((snapshot) => {
        if (mounted) setUser(snapshot.user);
      })
      .catch((restoreError) => {
        if (mounted) {
          setUser(null);
          setError(restoreError instanceof Error ? restoreError.message : "Unable to restore your session.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    apiClient.setAuthTokenProvider(() => authSession.read().accessToken);

    const handleUnauthorized = () => {
      authSession.clear();
      setUser(null);
      setError("Your session expired. Sign in again to continue.");
    };

    window.addEventListener("cvg:auth-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("cvg:auth-unauthorized", handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const snapshot = await authSession.login(email, password);
      setUser(snapshot.user);
      setError(null);
      return true;
    } catch (loginError) {
      setUser(null);
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiClient.post("/api/v1/auth/logout", undefined, { retryCount: 0 });
    } catch {
      // Remote logout is best-effort; local session cleanup must always happen.
    } finally {
      authSession.clear();
      setUser(null);
      setLoading(false);
      window.location.assign("/login");
    }
  }, []);

  const refresh = useCallback(async () => {
    const snapshot = await authSession.refresh();
    setUser(snapshot.user);
  }, []);

  const validateSession = useCallback(async () => {
    const valid = await authSession.validate();
    if (!valid) setUser(null);
    return valid;
  }, []);

  const permissions = user?.permissions ?? [];
  const can = useCallback((permission: string) => permissions.includes("admin:all") || permissions.includes(permission), [permissions]);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      permissions,
      login,
      logout,
      refresh,
      validateSession,
      can
    }),
    [can, error, loading, login, logout, permissions, refresh, user, validateSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

export type { AuthUser };
