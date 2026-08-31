import type { StockPhoto } from '@/lib/stock';

/**
 * Unsplash production guideline: "Photo by Annie Spratt on Unsplash"
 * with the photographer name and Unsplash each linked (UTM already on the URLs).
 */
export default function StockAttribution({ photo }: { photo: StockPhoto }) {
  const sourceLabel = photo.source === 'unsplash' ? 'Unsplash' : 'Pixabay';
  return (
    <p className="truncate px-1.5 py-1 text-[10px] leading-snug text-slate-500">
      Photo by{' '}
      <a
        href={photo.photographerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-slate-600 hover:text-gaia-600 hover:underline"
        onClick={(e) => e.stopPropagation()}
        title={photo.photographerName}
      >
        {photo.photographerName}
      </a>
      {' '}on{' '}
      <a
        href={photo.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-slate-600 hover:text-gaia-600 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {sourceLabel}
      </a>
    </p>
  );
}
