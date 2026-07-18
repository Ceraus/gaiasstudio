import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useAppStore } from "../../state/useAppStore";
import type { AveryTemplate, LabelContext, LabelShape } from "../../../shared/contract";
import { ShapePreview } from "./ShapePreview";
import { RefreshCw, Check } from "lucide-react";

const SHAPE_FILTERS: { key: LabelShape | "all"; labelKey: string }[] = [
  { key: "all", labelKey: "template.shapeAll" },
  { key: "circle", labelKey: "template.shapeCircle" },
  { key: "oval", labelKey: "template.shapeOval" },
  { key: "square", labelKey: "template.shapeSquare" },
  { key: "rectangle", labelKey: "template.shapeRectangle" },
];

const CONTEXTS: { key: LabelContext; titleKey: string; helpKey: string; emoji: string }[] = [
  { key: "front", titleKey: "template.contextFront", helpKey: "template.contextFrontHelp", emoji: "🏷️" },
  { key: "back", titleKey: "template.contextBack", helpKey: "template.contextBackHelp", emoji: "📋" },
  { key: "side", titleKey: "template.contextSide", helpKey: "template.contextSideHelp", emoji: "🎀" },
];

export function TemplatePicker() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<AveryTemplate[]>([]);
  const [shapeFilter, setShapeFilter] = useState<LabelShape | "all">("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const templateSku = useAppStore((s) => s.templateSku);
  const context = useAppStore((s) => s.context);
  const setTemplateSku = useAppStore((s) => s.setTemplateSku);
  const setContext = useAppStore((s) => s.setContext);
  const setStep = useAppStore((s) => s.setStep);

  useEffect(() => {
    api.templates.getAll().then(setTemplates);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (shapeFilter !== "all" && tpl.shape !== shapeFilter) return false;
      if (!q) return true;
      return (
        tpl.sku.toLowerCase().includes(q) ||
        tpl.name.toLowerCase().includes(q) ||
        `${tpl.widthIn}`.includes(q) ||
        `${tpl.heightIn}`.includes(q)
      );
    });
  }, [templates, shapeFilter, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    const result = await api.templates.refresh();
    const all = await api.templates.getAll();
    setTemplates(all);
    setRefreshMsg(
      result.success ? t("template.refreshSuccess", { count: result.count }) : t("template.refreshFailed", { count: all.length })
    );
    setRefreshing(false);
  };

  const selected = templates.find((tp) => tp.sku === templateSku);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-bold text-brand-800">{t("template.heading")}</h1>
      <p className="mt-1 text-brand-600">{t("template.subheading")}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {SHAPE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setShapeFilter(f.key)}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              shapeFilter === f.key ? "bg-brand-600 text-white" : "bg-white text-brand-700 border border-brand-200 hover:bg-brand-50",
            ].join(" ")}
          >
            {t(f.labelKey)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? t("template.refreshing") : t("template.refreshCatalog")}
          </button>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("template.searchPlaceholder")}
        className="mt-4 w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
      />

      {refreshMsg && <p className="mt-2 text-sm text-brand-600">{refreshMsg}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((tpl) => {
          const isSelected = tpl.sku === templateSku;
          return (
            <button
              key={tpl.sku}
              onClick={() => setTemplateSku(tpl.sku)}
              className={[
                "flex flex-col items-center gap-2 rounded-2xl border-2 bg-white p-4 text-center shadow-sm transition-all",
                isSelected ? "border-brand-600 ring-2 ring-brand-200" : "border-transparent hover:border-brand-200",
              ].join(" ")}
            >
              <ShapePreview shape={tpl.shape} widthIn={tpl.widthIn} heightIn={tpl.heightIn} />
              <div className="text-sm font-semibold text-brand-800">Avery {tpl.sku}</div>
              <div className="text-xs text-brand-600">
                {tpl.shape === "circle"
                  ? t("template.diameter", { size: tpl.widthIn })
                  : t("template.size", { width: tpl.widthIn, height: tpl.heightIn })}
              </div>
              <div className="text-xs text-gray-400">{t("template.labelsPerSheet", { count: tpl.columns * tpl.rows })}</div>
              {isSelected && (
                <span className="mt-1 flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Check size={12} /> Selected
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-10 rounded-2xl border border-brand-200 bg-white p-6 shadow-panel">
          <h2 className="text-lg font-bold text-brand-800">{t("template.contextHeading")}</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CONTEXTS.map((c) => (
              <button
                key={c.key}
                onClick={() => setContext(c.key)}
                className={[
                  "rounded-xl border-2 p-4 text-left transition-colors",
                  context === c.key ? "border-brand-600 bg-brand-50" : "border-gray-200 hover:border-brand-200",
                ].join(" ")}
              >
                <div className="text-2xl">{c.emoji}</div>
                <div className="mt-2 font-semibold text-brand-800">{t(c.titleKey)}</div>
                <div className="mt-1 text-sm text-brand-600">{t(c.helpKey)}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep("assets")}
            className="mt-6 w-full rounded-xl bg-brand-600 py-3 text-center font-semibold text-white shadow-panel hover:bg-brand-700 sm:w-auto sm:px-8"
          >
            {t("template.continue")}
          </button>
        </div>
      )}
    </div>
  );
}
