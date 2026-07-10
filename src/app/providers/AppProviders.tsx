import type { ReactNode } from "react";
import { AuthProvider } from "@/core/auth/AuthContext";
import { DemoDataProvider } from "./DemoDataProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DemoDataProvider>{children}</DemoDataProvider>
    </AuthProvider>
  );
}
