import { ImagePlus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileUploadCard } from "@/shared/components/FileUploadCard";
import { PhotoPreviewModal } from "@/shared/components/PhotoPreviewModal";
import type { GalleryPhoto } from "@/shared/types/domain";
import { useProjectBundle } from "./projectHelpers";

export function ProjectGalleryPage() {
  const { projectId } = useParams();
  const { project, projectPhotos, addGalleryPhoto } = useProjectBundle(projectId);
  const [showAdd, setShowAdd] = useState(false);

  if (!project) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-bold text-slate-950">Project not found</h1>
        <Link to="/projects" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Back to projects</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-field">Gallery</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{project.name}</h1>
          <p className="mt-2 text-slate-500">Project media grid, preview modal, and add media surface.</p>
        </div>
        <button onClick={() => setShowAdd((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
          <ImagePlus size={18} />
          Add media
        </button>
      </div>
      {showAdd && (
        <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft md:grid-cols-3">
          <FileUploadCard compact accept="image/*" title="Upload photo" helper="Adds a project photo with object URL." onFileSelected={(file) => addGalleryPhoto(project.id, file)} />
          <button className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left font-semibold text-ink">Attach from task</button>
          <button className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left font-semibold text-ink">Create field note</button>
        </div>
      )}
      <GalleryGrid photos={projectPhotos} />
    </div>
  );
}

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [preview, setPreview] = useState<GalleryPhoto | null>(null);
  const activeIndex = preview ? Math.max(0, photos.findIndex((photo) => photo.id === preview.id)) : -1;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((photo) => (
          <button key={photo.id} onClick={() => setPreview(photo)} className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-soft transition hover:-translate-y-1">
            <img src={photo.url} alt={photo.title} className="h-52 w-full object-cover" />
            <div className="p-4">
              <p className="font-semibold text-ink">{photo.title}</p>
              <p className="mt-1 text-sm text-slate-500">{photo.category} · {photo.uploadedAt}</p>
            </div>
          </button>
        ))}
      </div>
      <PhotoPreviewModal
        photo={preview}
        onClose={() => setPreview(null)}
        onPrevious={() => activeIndex >= 0 && setPreview(photos[(activeIndex - 1 + photos.length) % photos.length])}
        onNext={() => activeIndex >= 0 && setPreview(photos[(activeIndex + 1) % photos.length])}
      />
    </>
  );
}
