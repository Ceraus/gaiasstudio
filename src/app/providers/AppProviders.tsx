import type { ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";
import { AuthProvider } from "@/core/auth/AuthContext";
import { DemoDataProvider } from "./DemoDataProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <AuthProvider>
        <DemoDataProvider>{children}</DemoDataProvider>
      </AuthProvider>
    </ReduxProvider>
  );
}
