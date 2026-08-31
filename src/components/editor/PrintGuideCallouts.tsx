import { useTranslation } from 'react-i18next';

interface PrintGuideCalloutsProps {
  canvasW: number;
  canvasH: number;
  zoom: number;
  bleedPx: number;
  safePx: number;
  showPrintToTheEdge: boolean;
  showSafetyArea: boolean;
}

/**
 * Avery Design & Print labeled tabs that sit on the bleed / safety rings.
 * Shown only while a drag intersects that ring — not at rest.
 */
export default function PrintGuideCallouts({
  canvasW,
  canvasH,
  zoom,
  bleedPx,
  safePx,
  showPrintToTheEdge,
  showSafetyArea,
}: PrintGuideCalloutsProps) {
  const { t } = useTranslation();

  if (!showPrintToTheEdge && !showSafetyArea) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[5]"
      style={{
        width: canvasW,
        height: canvasH,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
      }}
    >
      {showPrintToTheEdge && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[5px] bg-[#3f3f46] px-2 py-[3px] text-[9px] font-semibold tracking-wide text-white shadow-sm"
          style={{ top: 1 }}
          data-testid="print-to-the-edge-label"
        >
          {t('editor.printToTheEdge', 'Print to the Edge')}
        </div>
      )}
      {showSafetyArea && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[5px] bg-[#3f3f46] px-2 py-[3px] text-[9px] font-semibold tracking-wide text-white shadow-sm"
          style={{ top: bleedPx + safePx }}
          data-testid="safety-area-label"
        >
          {t('editor.safetyArea', 'Safety Area')}
        </div>
      )}
    </div>
  );
}
