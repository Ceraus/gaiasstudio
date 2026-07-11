import { EarthGlobeCanvas } from '@/shared/components/globe/EarthGlobeCanvas'

export function LoginEarthCanvas({ onReady }: { onReady?: () => void }) {
  return (
    <div className="relative h-full w-full">
      <EarthGlobeCanvas
        className="h-full w-full globe-canvas-fade-in"
        autoRotate
        enableRotate={false}
        enableZoom={false}
        starCount={1400}
        cameraDistance={6.3}
        qualityTier="auto"
        onReady={onReady}
      />
    </div>
  )
}
