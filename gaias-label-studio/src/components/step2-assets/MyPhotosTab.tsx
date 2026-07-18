import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UploadCloud } from "lucide-react";
import { api } from "../../lib/api";
import { AssetThumb } from "./AssetThumb";

interface Photo {
  fileName: string;
  dataUrl: string;
}

export function MyPhotosTab({ onUse }: { onUse: (dataUrl: string) => void }) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);

  const handleUpload = async () => {
    setBusy(true);
    try {
      const picked = await api.files.pickImages();
      const withData = await Promise.all(
        picked.map(async (p) => ({ fileName: p.fileName, dataUrl: await api.files.readAsDataUrl(p.filePath) }))
      );
      setPhotos((prev) => [...withData, ...prev]);
      await Promise.all(
        picked.map((p) => api.library.add({ fileName: p.fileName, filePath: p.filePath, source: "upload" }))
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleUpload}
        disabled={busy}
        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-4 py-8 text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
      >
        <UploadCloud size={28} />
        <span className="font-semibold">{t("assets.uploadButton")}</span>
        <span className="text-xs text-brand-500">{t("assets.uploadHint")}</span>
      </button>

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <AssetThumb key={`${p.fileName}-${i}`} dataUrl={p.dataUrl} label={p.fileName} onUse={onUse} />
          ))}
        </div>
      )}
    </div>
  );
}
