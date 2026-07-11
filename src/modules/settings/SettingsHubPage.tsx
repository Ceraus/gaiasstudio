import { useNavigate, useParams } from "react-router-dom";
import {
  Bot,
  Building2,
  Keyboard,
  LogOut,
  Mail,
  Plug,
  Settings,
  ShieldCheck,
  Sliders,
  UserCircle,
} from "lucide-react";
import { Avatar } from "@/shared/components/Avatar";
import { StatCard } from "@/shared/components/StatCard";
import { MouseKeyboardPanel } from "@/modules/profile/MouseKeyboardPanel";
import { useAuth } from "@/core/auth/AuthContext";

// ── Tab registry ──────────────────────────────────────────────────────────────
const SETTINGS_TABS = [
  { id: "general",      label: "General",      icon: Sliders     },
  { id: "account",      label: "Account",      icon: UserCircle  },
  { id: "ai-hub",       label: "AI Hub",       icon: Bot         },
  { id: "integrations", label: "Integrations", icon: Plug        },
] as const;

type SettingsSection = (typeof SETTINGS_TABS)[number]["id"];

// ── Hub shell ─────────────────────────────────────────────────────────────────
export function SettingsHubPage() {
  const { section = "general" } = useParams<{ section?: string }>();
  const activeSection = (
    SETTINGS_TABS.some((t) => t.id === section) ? section : "general"
  ) as SettingsSection;

  const navigate = useNavigate();

  function selectSection(id: SettingsSection) {
    navigate(id === "general" ? "/settings" : `/settings/${id}`);
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div>
        <p className="text-sm font-semibold uppercase text-field">Clearplan Command</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-2 text-slate-500">
          Configuration gateway for account, AI extraction rules, and external integrations.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div
        className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        role="tablist"
        aria-label="Settings sections"
      >
        {SETTINGS_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectSection(id)}
              className={[
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                isActive
                  ? "bg-[#166eb4] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
            >
              <Icon size={13} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab panels ── */}
      {activeSection === "general"      && <GeneralTab />}
      {activeSection === "account"      && <AccountTab />}
      {activeSection === "ai-hub"       && <AiHubTab />}
      {activeSection === "integrations" && <IntegrationsTab />}
    </div>
  );
}

// ── General — system-wide configuration ──────────────────────────────────────
function GeneralTab() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-field" aria-hidden />
          <h2 className="text-xl font-semibold text-ink">System configuration</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ["Default language",    "English (US)"],
            ["Date format",         "MM/DD/YYYY"],
            ["Time zone",           "America/New_York"],
            ["Session timeout",     "30 minutes"],
            ["Data refresh rate",   "5 minutes"],
            ["Audit log retention", "90 days"],
          ].map(([label, value]) => (
            <label key={label} className="text-sm font-semibold text-slate-500">
              {label}
              <input
                defaultValue={value}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink outline-none focus:border-field"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <Keyboard size={20} className="text-field" aria-hidden />
          <h2 className="text-xl font-semibold text-ink">Mouse &amp; Keyboard</h2>
        </div>
        <div className="mt-4">
          <MouseKeyboardPanel />
        </div>
      </section>
    </div>
  );
}

// ── Account — user profile + company details ──────────────────────────────────
function AccountTab() {
  const { logout, permissions, user } = useAuth();
  const displayName = user?.name ?? "User";

  return (
    <div className="space-y-6">

      {/* User profile card */}
      <section className="card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={displayName} />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-ink">{displayName}</h2>
              <p className="mt-1 break-all text-sm font-semibold text-slate-500">
                {user?.email ?? "demo@clearplan.local"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lift"
          >
            <LogOut size={16} aria-hidden />
            Sign out
          </button>
        </div>
      </section>

      {/* Identity stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Account type" value="Demo"  detail="Mock auth session"          icon={UserCircle}  />
        <StatCard label="Email"        value={user?.email ? "Set" : "Demo"} detail={user?.email ?? "No backend identity yet"} icon={Mail} />
        <StatCard label="Permissions"  value={String(permissions.length)} detail="Frontend capability flags" icon={ShieldCheck} />
      </div>

      {/* User preferences */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">User preferences</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(["Company", "Role", "Default view", "Data mode"] as const).map((label, index) => (
            <label key={label} className="text-sm font-semibold text-slate-500">
              {label}
              <input
                readOnly
                value={["Clearview Global", "Administrator", "Projects", "Live"][index]}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink outline-none"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Company profile */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <Building2 size={20} className="text-field" aria-hidden />
          <h2 className="text-xl font-semibold text-ink">Company profile</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ["Company name",    "Clearplan Command"],
            ["Primary contact", ""],
            ["Billing email",   ""],
            ["Default time zone", "America/New_York"],
            ["Office address",  ""],
            ["Storage policy",  ""],
          ].map(([label, defaultValue]) => (
            <label key={label} className="text-sm font-semibold text-slate-500">
              {label}
              <input
                defaultValue={defaultValue}
                placeholder="Not configured"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink outline-none focus:border-field"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── AI Hub — extraction rules and model configuration ─────────────────────────
function AiHubTab() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <Bot size={20} className="text-field" aria-hidden />
          <h2 className="text-xl font-semibold text-ink">AI Hub configuration</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Configure AI extraction rules, language model endpoints, and Vault Import processing
          behaviour for this Clearplan Command instance.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["Ollama endpoint",     "http://localhost:11434"],
            ["Default model",       "qwen2.5-coder"],
            ["Extraction timeout",  "60 seconds"],
            ["Max file size",       "50 MB"],
          ].map(([label, defaultValue]) => (
            <label key={label} className="text-sm font-semibold text-slate-500">
              {label}
              <input
                defaultValue={defaultValue}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink font-mono text-sm outline-none focus:border-field"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-ink">Extraction taxonomy enforcement</h2>
        <p className="mt-1 text-sm text-slate-500">
          Vault Import will map detected service tiers strictly to the following taxonomy.
        </p>
        <ul className="mt-4 space-y-2">
          {[
            "SIMPLE_1 — Simple Contract (3 Page)",
            "SIMPLE_2 — Simple Contract (5 Page)",
            "SLA_HELPDESK — SLA Helpdesk Support",
            "SLA_MONTHLY_NETWORK — SLA Monthly Network",
            "SLA_ACCESS_CONTROL — SLA Access Control",
          ].map((tier) => (
            <li key={tier} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-mono text-slate-700">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-field" />
              {tier}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ── Integrations — API keys and external service connections ──────────────────
function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <Plug size={20} className="text-field" aria-hidden />
          <h2 className="text-xl font-semibold text-ink">External integrations</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Manage API keys and connection credentials for all external service gateways.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["Meilisearch host",   "http://localhost:7700"],
            ["Meilisearch API key",""],
            ["Paperless-ngx URL",  "http://localhost:8000"],
            ["Paperless-ngx token",""],
            ["Global API base URL","http://localhost:8080"],
            ["API auth token",     ""],
          ].map(([label, defaultValue]) => (
            <label key={label} className="text-sm font-semibold text-slate-500">
              {label}
              <input
                defaultValue={defaultValue}
                placeholder="Not configured"
                type={label.toLowerCase().includes("key") || label.toLowerCase().includes("token") ? "password" : "text"}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink font-mono text-sm outline-none focus:border-field"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-ink">Connected services</h2>
        <ul className="mt-4 space-y-3">
          {[
            { label: "Microsoft 365",  hint: "Configure SSO via Global-API /auth/sso/status", path: "/m365"  },
            { label: "Meilisearch",    hint: "Global search engine across all indices",       path: null    },
            { label: "Paperless-ngx",  hint: "Document intelligence and Vault Import gateway", path: null   },
            { label: "LinkedIn",       hint: "Outreach pipeline — configure in AI Hub",       path: null    },
          ].map(({ label, hint }) => (
            <li key={label} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="text-xs text-slate-400">{hint}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Pending
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
