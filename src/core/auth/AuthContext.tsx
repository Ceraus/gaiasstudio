import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDispatch } from "react-redux";
import { apiClient } from "../api";
import { authSession, type AuthUser } from "./authSession";
import { clearDevSession, loadDevSession } from "./devSession";
import { syncAuthSession } from "@/store/authSlice";
import type { AppDispatch } from "@/store";

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
  const dispatch = useDispatch<AppDispatch>();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publishSession = useCallback(
    (snapshot: { user: AuthUser | null; accessToken: string | null }) => {
      dispatch(syncAuthSession(snapshot));
      setUser(snapshot.user);
    },
    [dispatch],
  );

  useEffect(() => {
    let mounted = true;

    if (import.meta.env.DEV) {
      const devUser = loadDevSession();
      if (devUser) {
        if (mounted) {
          publishSession({ user: devUser, accessToken: "dev-session-token" });
          setLoading(false);
        }
        return () => { mounted = false; };
      }
    }

    authSession
      .refresh()
      .then((snapshot) => {
        if (mounted) publishSession(snapshot);
      })
      .catch((restoreError) => {
        if (mounted) {
          publishSession({ user: null, accessToken: null });
          setError(restoreError instanceof Error ? restoreError.message : "Unable to restore your session.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [publishSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      authSession.clear();
      publishSession({ user: null, accessToken: null });
      setError("Your session expired. Sign in again to continue.");
    };

    window.addEventListener("cvg:auth-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("cvg:auth-unauthorized", handleUnauthorized);
  }, [publishSession]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const snapshot = await authSession.login(email, password);
      publishSession(snapshot);
      setError(null);
      return true;
    } catch (loginError) {
      publishSession({ user: null, accessToken: null });
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [publishSession]);

  const logout = useCallback(async () => {
    setLoading(true);
    if (import.meta.env.DEV) clearDevSession();
    try {
      await apiClient.post("/api/v1/auth/logout", undefined, { retryCount: 0 });
    } catch {
      // Remote logout is best-effort; local session cleanup must always happen.
    } finally {
      authSession.clear();
      publishSession({ user: null, accessToken: null });
      setLoading(false);
      window.location.assign("/login");
    }
  }, [publishSession]);

  const refresh = useCallback(async () => {
    const snapshot = await authSession.refresh();
    publishSession(snapshot);
  }, [publishSession]);

  const validateSession = useCallback(async () => {
    const valid = await authSession.validate();
    if (!valid) publishSession({ user: null, accessToken: null });
    return valid;
  }, [publishSession]);

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
