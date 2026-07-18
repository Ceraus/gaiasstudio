import { useTranslation } from "react-i18next";

export function AssetThumb({
  dataUrl,
  label,
  onUse,
}: {
  dataUrl: string;
  label?: string;
  onUse: (dataUrl: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/gaia-asset", dataUrl);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="group relative aspect-square overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm"
      title={t("assets.dragToCanvasHint")}
    >
      <img src={dataUrl} alt={label ?? "asset"} className="h-full w-full object-cover" />
      <button
        onClick={() => onUse(dataUrl)}
        className="absolute inset-x-1 bottom-1 rounded-lg bg-brand-700/90 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        {t("assets.addToCanvas")}
      </button>
    </div>
  );
}
