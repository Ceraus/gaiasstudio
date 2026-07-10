import { Modal } from "./Modal";
import type { GalleryPhoto } from "@/shared/types/domain";

interface PhotoPreviewModalProps {
  photo: GalleryPhoto | null;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function PhotoPreviewModal({ photo, onClose, onNext, onPrevious }: PhotoPreviewModalProps) {
  return (
    <Modal title={photo?.title ?? "Photo preview"} open={Boolean(photo)} onClose={onClose}>
      {photo && (
        <div>
          <img src={photo.url} alt={photo.title} className="max-h-[64vh] w-full rounded-2xl object-cover" />
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>{photo.category}</span>
            <span>{photo.uploadedAt}</span>
          </div>
          {(onPrevious || onNext) && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={onPrevious} className="rounded-full border border-slate-200 px-4 py-3 font-semibold text-slate-700">Previous</button>
              <button onClick={onNext} className="rounded-full bg-slate-950 px-4 py-3 font-semibold text-white">Next</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
