import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  LayoutGrid,
  Mail,
  MessageSquare,
  Unplug,
  Wifi,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { brokerM365SsoStatus, clearM365Token } from "@/store/m365Slice";

// ── Tab registry ──────────────────────────────────────────────────────────────
const M365_TABS = [
  { id: "overview",  label: "Overview",       icon: LayoutGrid  },
  { id: "mail",      label: "Outlook Mail",   icon: Mail        },
  { id: "calendar",  label: "Calendar",       icon: Calendar    },
  { id: "tasks",     label: "To Do / Tasks",  icon: CheckSquare },
  { id: "teams",     label: "Teams",          icon: MessageSquare },
] as const;

type M365TabId = (typeof M365_TABS)[number]["id"];

// ── Microsoft 365 icon (4-square grid, same as Sidebar) ──────────────────────
function IconM365({ size = 32, className }: { size?: number; className?: string }) {
  const s = Math.round(size * 0.38);
  const g = Math.round(size * 0.08);
  const o = Math.round((size - 2 * s - g) / 2);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="currentColor" className={className} aria-hidden>
      <rect x={o}         y={o}         width={s} height={s} rx="2" />
      <rect x={o + s + g} y={o}         width={s} height={s} rx="2" />
      <rect x={o}         y={o + s + g} width={s} height={s} rx="2" />
      <rect x={o + s + g} y={o + s + g} width={s} height={s} rx="2" />
    </svg>
  );
}

// ── Main hub page ─────────────────────────────────────────────────────────────
export function M365HubPage() {
  const { tab = "overview" } = useParams<{ tab?: string }>();
  const activeTab = (M365_TABS.some((t) => t.id === tab) ? tab : "overview") as M365TabId;

  const dispatch    = useAppDispatch();
  const navigate    = useNavigate();
  const accessToken = useAppSelector((s) => s.m365.accessToken);
  const tokenExpiry = useAppSelector((s) => s.m365.tokenExpiry);
  const userEmail   = useAppSelector((s) => s.m365.userEmail);
  const ssoStatus   = useAppSelector((s) => s.m365.ssoStatus);
  const ssoLoading  = useAppSelector((s) => s.m365.status === "loading");

  const isConnected = !!accessToken && !!tokenExpiry && Date.now() < tokenExpiry;

  // Broker SSO status on mount if we haven't checked yet.
  useEffect(() => {
    if (!ssoStatus) {
      dispatch(brokerM365SsoStatus());
    }
  }, [dispatch, ssoStatus]);

  function handleConnect() {
    dispatch(brokerM365SsoStatus()).then((result) => {
      if (brokerM365SsoStatus.fulfilled.match(result)) {
        const { enabled, redirect_url } = result.payload;
        if (enabled && redirect_url) {
          window.location.href = redirect_url;
        }
      }
    });
  }

  function handleDisconnect() {
    dispatch(clearM365Token());
  }

  function selectTab(id: M365TabId) {
    navigate(`/m365/${id}`);
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
            <IconM365 size={26} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase text-field">Clearplan Command</p>
            <h1 className="mt-0.5 text-3xl font-semibold text-ink">Microsoft 365</h1>
          </div>
        </div>

        {/* Connection status pill */}
        {isConnected ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <Wifi size={14} aria-hidden />
              <span>{userEmail}</span>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Unplug size={14} aria-hidden />
              Disconnect
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={ssoLoading || (ssoStatus !== null && !ssoStatus.enabled)}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconM365 size={16} />
            {ssoLoading ? "Connecting…" : "Connect Microsoft 365"}
          </button>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
        {M365_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id as M365TabId)}
            className={[
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
              activeTab === id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            <Icon size={15} aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {isConnected ? (
        <ConnectedTabContent tab={activeTab} />
      ) : (
        <DisconnectedPanel ssoEnabled={ssoStatus?.enabled ?? false} onConnect={handleConnect} loading={ssoLoading} />
      )}
    </div>
  );
}

// ── Connected tab content ─────────────────────────────────────────────────────
function ConnectedTabContent({ tab }: { tab: M365TabId }) {
  const iframeUrls: Record<M365TabId, string> = {
    overview:  "https://www.office.com",
    mail:      "https://outlook.office.com/mail",
    calendar:  "https://outlook.office.com/calendar",
    tasks:     "https://to-do.office.com/tasks",
    teams:     "https://teams.microsoft.com",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <iframe
        key={tab}
        src={iframeUrls[tab]}
        title={`Microsoft 365 — ${tab}`}
        className="h-[72vh] w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}

// ── Disconnected state panel ──────────────────────────────────────────────────
function DisconnectedPanel({
  ssoEnabled,
  onConnect,
  loading,
}: {
  ssoEnabled: boolean;
  onConnect: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
        <IconM365 size={36} />
      </div>
      <div className="max-w-sm">
        <h2 className="text-xl font-semibold text-slate-900">Connect your Microsoft account</h2>
        <p className="mt-2 text-sm text-slate-500">
          Sign in with your Microsoft 365 account to access Outlook Mail, Calendar, Tasks, and Teams
          directly within Clearplan Command.
        </p>
      </div>
      {ssoEnabled ? (
        <button
          type="button"
          onClick={onConnect}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-blue-700 disabled:opacity-50"
        >
          <IconM365 size={16} />
          {loading ? "Redirecting…" : "Sign in with Microsoft"}
        </button>
      ) : (
        <p className="text-xs text-slate-400">
          Microsoft 365 SSO is not yet configured on this instance.
          Contact your administrator to enable it.
        </p>
      )}
    </div>
  );
}
