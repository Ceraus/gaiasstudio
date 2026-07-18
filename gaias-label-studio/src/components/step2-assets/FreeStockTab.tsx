import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { api } from "../../lib/api";
import type { StockPhoto } from "../../../shared/contract";

export function FreeStockTab({ onUse }: { onUse: (dataUrl: string) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    const unsplash = await api.stock.search(query, "unsplash");
    const pixabay = await api.stock.search(query, "pixabay");
    const combined = [...(unsplash.results ?? []), ...(pixabay.results ?? [])];
    setResults(combined);
    if (!combined.length) {
      setError(unsplash.error || pixabay.error || null);
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={t("assets.stockSearchPlaceholder")}
          className="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button onClick={search} disabled={busy} className="rounded-lg bg-brand-600 px-3 text-white disabled:opacity-60">
          <Search size={16} />
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-brand-500">{error || t("assets.stockNoKey")}</p>}

      {results.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {results.map((r) => (
            <button
              key={`${r.provider}-${r.id}`}
              onClick={() => onUse(r.fullUrl)}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/gaia-asset", r.fullUrl)}
              className="aspect-square overflow-hidden rounded-xl border border-brand-100"
              title={r.credit}
            >
              <img src={r.thumbUrl} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
