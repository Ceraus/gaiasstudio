import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import type { LibraryAsset } from "../../../shared/contract";
import { AssetThumb } from "./AssetThumb";

export function LibraryTab({ onUse, refreshKey }: { onUse: (dataUrl: string) => void; refreshKey?: number }) {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<(LibraryAsset & { dataUrl: string })[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await api.library.list();
      const withData = await Promise.all(
        list.map(async (a) => ({ ...a, dataUrl: await api.files.readAsDataUrl(a.filePath) }))
      );
      if (!cancelled) setAssets(withData);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (assets.length === 0) {
    return <p className="text-sm text-brand-500">{t("assets.libraryEmpty")}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {assets.map((a) => (
        <AssetThumb key={a.id} dataUrl={a.dataUrl} label={a.fileName} onUse={onUse} />
      ))}
    </div>
  );
}
