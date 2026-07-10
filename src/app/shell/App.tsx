import { useLocation } from "react-router-dom";
import { AppShell } from "@/app/shell/AppShell";
import { AppProviders } from "@/app/providers/AppProviders";
import { AuthGuard } from "@/core/auth/AuthGuard";
import { PwaLifecycle } from "@/infrastructure/offline/PwaLifecycle";
import { AppRoutes } from "@/app/router/AppRoutes";

export function App() {
  const location = useLocation();
  const shellless = location.pathname === "/login";

  if (shellless) {
    return (
      <AppProviders>
        <AppRoutes />
        <PwaLifecycle />
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <AuthGuard>
        <AppShell>
          <AppRoutes />
        </AppShell>
        <PwaLifecycle />
      </AuthGuard>
    </AppProviders>
  );
}
