import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthContext";
import { activateDevSession } from "@/core/auth/devSession";
import type { AuthUser } from "@/core/auth/authSession";
import { LoginAuthLayout } from "./LoginAuthLayout";
import { AnimatedCommandLogo } from "@/shared/components/branding/AnimatedCommandLogo";

// Dev-only: loads an untracked *.local.ts account file. Resolves to nothing
// in production since the glob is guarded by import.meta.env.DEV.
const devOfflineModules = import.meta.env.DEV
  ? import.meta.glob("@/dev/*.local.ts", { eager: true })
  : {};
const devOfflineAccount = (
  Object.values(devOfflineModules)[0] as
    | { devOfflineAccount?: { user: AuthUser; label?: string } }
    | undefined
)?.devOfflineAccount;

const MICROSOFT_SSO_URL = "https://api.clearviewglobal.net/api/v1/auth/sso/microsoft/redirect";

const SSO_ERROR_MESSAGES: Record<string, string> = {
  "unauthorized-domain":
    "Unauthorized Domain — only @clearviewglobal.com Microsoft 365 accounts may sign in to Clearplan Command.",
  "domain-not-allowed": "Only company Microsoft 365 accounts are allowed to sign in.",
  "wrong-tenant": "That account is not part of the company organization.",
  "exchange-failed": "Microsoft sign-in could not be completed. Please try again.",
  "login-failed": "Microsoft sign-in could not be started. Please try again.",
  "pending-approval":
    "Your account is pending approval. A Clearview administrator must activate your access before you can sign in.",
  "access-denied":
    "Access to Clearplan Command was denied. Contact your administrator if you believe this is an error.",
  "encryption-locked": "Sign-in is not yet available — contact your administrator.",
  disabled: "This account has been disabled.",
};

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

const panelClass =
  "rounded-xl border border-slate-700 bg-slate-900/95 p-6 shadow-lg backdrop-blur-sm";

export function LoginPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { loading, user } = useAuth();
  const from = getReturnPath(location.state);

  // ── Auth state engine (Redux) — preserved exactly ──────────────────────────
  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  function handleMicrosoftSignIn() {
    window.location.assign(MICROSOFT_SSO_URL);
  }
  // ───────────────────────────────────────────────────────────────────────────

  function handleDevOfflineLogin() {
    if (!devOfflineAccount) return;
    activateDevSession(devOfflineAccount.user);
    window.location.assign("/dashboard");
  }

  const ssoCallbackError = searchParams.get("error");
  const alertMessage = ssoCallbackError
    ? (SSO_ERROR_MESSAGES[ssoCallbackError] ?? `Microsoft sign-in failed (${ssoCallbackError}).`)
    : null;

  return (
    <LoginAuthLayout>
      <div className={panelClass}>
        {alertMessage ? (
          <p
            className="mb-4 rounded-md bg-red-950/60 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            {alertMessage}
          </p>
        ) : null}

        <div className="mb-6 flex items-center justify-center">
          <AnimatedCommandLogo size={56} className="command-symbol-glow" />
        </div>

        {/* Sign-in button — onClick bound to the preserved Redux gateway function */}
        <button
          type="button"
          onClick={handleMicrosoftSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[#166eb4] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#125c96] focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:cursor-wait disabled:opacity-60"
        >
          <MicrosoftMark />
          Sign in with Microsoft
        </button>

        <p className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-500">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]"
            aria-hidden="true"
          />
          OAuth 2.0 • Microsoft Identity Platform
        </p>

        {import.meta.env.DEV && devOfflineAccount ? (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-amber-300/40" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                Dev Only
              </span>
              <div className="h-px flex-1 bg-amber-300/40" />
            </div>
            <button
              type="button"
              onClick={handleDevOfflineLogin}
              className="w-full rounded-md border border-amber-400/60 bg-amber-50/10 px-4 py-2 text-sm font-semibold text-amber-400 transition hover:bg-amber-400/10"
            >
              {devOfflineAccount.label ?? "Dev Offline Login"}
            </button>
            <p className="mt-2 text-center text-[11px] text-amber-600/70">
              Offline — bypasses Microsoft SSO. Dev builds only.
            </p>
          </>
        ) : null}

        <div className="mt-5 border-t border-slate-800 pt-4">
          <p className="text-center text-[11px] font-semibold text-slate-600">
            Powered by Clearview Global.
          </p>
        </div>
      </div>
    </LoginAuthLayout>
  );
}

function getReturnPath(state: unknown) {
  if (state && typeof state === "object" && "from" in state && typeof state.from === "string") {
    return state.from;
  }
  return "/dashboard";
}
