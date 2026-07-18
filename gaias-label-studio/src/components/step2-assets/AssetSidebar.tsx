import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, FolderOpen, Sparkles, Wand2 } from "lucide-react";
import { MyPhotosTab } from "./MyPhotosTab";
import { LibraryTab } from "./LibraryTab";
import { FreeStockTab } from "./FreeStockTab";
import { AiTab } from "./AiTab";

type TabKey = "myphotos" | "library" | "stock" | "ai";

export function AssetSidebar({ onUse }: { onUse: (dataUrl: string) => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("myphotos");
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  const handleUse = (dataUrl: string) => {
    onUse(dataUrl);
    setLibraryRefreshKey((k) => k + 1);
  };

  const tabs: { key: TabKey; label: string; icon: JSX.Element }[] = [
    { key: "myphotos", label: t("assets.tabMyPhotos"), icon: <Image size={15} /> },
    { key: "library", label: t("assets.tabLibrary"), icon: <FolderOpen size={15} /> },
    { key: "stock", label: t("assets.tabStock"), icon: <Sparkles size={15} /> },
    { key: "ai", label: t("assets.tabAi"), icon: <Wand2 size={15} /> },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={[
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors",
              tab === tb.key ? "bg-white text-brand-700 shadow-sm" : "text-brand-500 hover:text-brand-700",
            ].join(" ")}
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex-1 overflow-y-auto no-scrollbar pr-1">
        {tab === "myphotos" && <MyPhotosTab onUse={handleUse} />}
        {tab === "library" && <LibraryTab onUse={handleUse} refreshKey={libraryRefreshKey} />}
        {tab === "stock" && <FreeStockTab onUse={handleUse} />}
        {tab === "ai" && <AiTab onUse={handleUse} />}
      </div>
    </div>
  );
}
