import { ArrowRight } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthContext";

const MICROSOFT_SSO_URL = "https://api.clearviewglobal.net/api/v1/auth/sso/microsoft/redirect";

export function LoginPage() {
  const location = useLocation();
  const { loading, user } = useAuth();
  const from = getReturnPath(location.state);

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  function handleMicrosoftSignIn() {
    window.location.assign(MICROSOFT_SSO_URL);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#060912] px-6 py-10 text-white">
      <section className="w-full max-w-[340px]" aria-label="Team access sign in">
        <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-500">Team Access</p>

        <div className="mt-8">
          <h1 className="max-w-[240px] text-[26px] font-bold leading-[1.08] tracking-normal text-white sm:text-[28px]">
            Sign in to
            <br />
            your account
          </h1>
          <p className="mt-4 max-w-[230px] text-xs font-medium leading-6 text-slate-500">Restricted to approved Clearview Global members.</p>
        </div>

        <div className="my-9 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-800" aria-hidden="true" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-600">Continue With</span>
          <span className="h-px flex-1 bg-slate-800" aria-hidden="true" />
        </div>

        <button
          type="button"
          onClick={handleMicrosoftSignIn}
          disabled={loading}
          className="flex h-14 w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900/80 px-5 text-sm font-bold text-white shadow-[0_18px_45px_rgba(0,0,0,0.22)] transition hover:border-slate-500 hover:bg-slate-800/95 focus:outline-none focus:ring-2 focus:ring-blue-400/70 disabled:cursor-wait disabled:opacity-70"
        >
          <span className="flex items-center gap-4">
            <span className="grid h-5 w-5 grid-cols-2 gap-0.5" aria-hidden="true">
              <span className="bg-[#f25022]" />
              <span className="bg-[#7fba00]" />
              <span className="bg-[#00a4ef]" />
              <span className="bg-[#ffb900]" />
            </span>
            Microsoft
          </span>
          <ArrowRight size={17} className="text-slate-600" aria-hidden="true" />
        </button>

        <p className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]" aria-hidden="true" />
          OAuth 2.0 • Microsoft Identity Platform
        </p>

        <div className="mt-8 border-t border-slate-800 pt-7">
          <p className="text-[11px] font-semibold text-slate-600">Powered by Clearview Global.</p>
        </div>
      </section>
    </main>
  );
}

function getReturnPath(state: unknown) {
  if (state && typeof state === "object" && "from" in state && typeof state.from === "string") {
    return state.from;
  }
  return "/dashboard";
}
