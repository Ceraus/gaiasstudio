import { FileUp, ImagePlus } from "lucide-react";

interface FileUploadCardProps {
  compact?: boolean;
  title?: string;
  helper?: string;
  accept?: string;
  onFileSelected?: (file: File) => void;
}

export function FileUploadCard({ compact = false, title = "Upload plan, PDF, or media", helper = "Stored in local React state for this demo", accept = "image/*,.pdf,application/pdf", onFileSelected }: FileUploadCardProps) {
  return (
    <label className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center transition hover:border-field hover:bg-blue-50/50 ${compact ? "p-4" : "p-8"}`}>
      <input
        className="sr-only"
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected?.(file);
          event.currentTarget.value = "";
        }}
      />
      <div className="rounded-2xl bg-slate-900 p-3 text-white">{compact ? <ImagePlus size={18} /> : <FileUp size={22} />}</div>
      <span className="mt-3 text-sm font-semibold text-ink">{title}</span>
      <span className="mt-1 text-xs text-slate-500">{helper}</span>
    </label>
  );
}
