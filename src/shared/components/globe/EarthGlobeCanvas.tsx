import { useRef, useMemo, useEffect, useState, Component, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls as ThreeOrbitControls } from 'three/addons/controls/OrbitControls.js'
import { latLonToVector3 } from '../../../utils/solar'

const INFRA_NODES: { lat: number; lng: number; label: string }[] = [
  { lat: 40.7, lng: -74.0, label: 'US-East' },
  { lat: 37.8, lng: -122.4, label: 'US-West' },
  { lat: 51.5, lng: -0.1, label: 'EU-West' },
  { lat: 52.5, lng: 13.4, label: 'EU-Central' },
  { lat: 35.7, lng: 139.7, label: 'AP-Northeast' },
  { lat: 1.3, lng: 103.8, label: 'AP-Southeast' },
  { lat: -33.9, lng: 151.2, label: 'AP-South' },
  { lat: 25.2, lng: 55.3, label: 'ME' },
]

const INFRA_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [5, 6], [6, 7], [4, 7],
]

const CORPORATE_BLUE = new THREE.Color('#176fb4')

function infraPosition(lat: number, lng: number, altitude: number) {
  return latLonToVector3(lat, lng, EARTH_RADIUS + altitude)
}

function CloudInfrastructureLayer({ animated }: { animated: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.LineBasicMaterial>(null)
  const nodeRefs = useRef<THREE.Mesh[]>([])

  const nodePositions = useMemo(
    () => INFRA_NODES.map((n) => infraPosition(n.lat, n.lng, 0.28)),
    [],
  )

  const lineGeometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (const [a, b] of INFRA_CONNECTIONS) {
      const pa = nodePositions[a]
      const pb = nodePositions[b]
      const mid = pa.clone().add(pb).multiplyScalar(0.5).normalize().multiplyScalar(EARTH_RADIUS + 0.48)
      const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb)
      if (animated) {
        const arc = curve.getPoints(32)
        for (let i = 0; i < arc.length - 1; i += 1) points.push(arc[i], arc[i + 1])
      } else {
        points.push(...curve.getPoints(18))
      }
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [nodePositions, animated])

  useFrame(({ clock }) => {
    if (!animated) return
    const t = clock.getElapsedTime()
    if (materialRef.current) materialRef.current.opacity = 0.15 + Math.sin(t * 0.7) * 0.035
    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      mesh.scale.setScalar(1 + Math.sin(t * 1.2 + i * 0.8) * 0.12)
    })
  })

  return (
    <group ref={groupRef}>
      {animated ? (
        <lineSegments geometry={lineGeometry}>
          <lineBasicMaterial
            ref={materialRef}
            color="#52c7ff"
            transparent
            opacity={0.16}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            linewidth={1}
            toneMapped={false}
          />
        </lineSegments>
      ) : (
        <lineSegments geometry={lineGeometry}>
          <lineBasicMaterial color={CORPORATE_BLUE} transparent opacity={0.28} linewidth={1} />
        </lineSegments>
      )}
    </group>
  )
}

export const EARTH_RADIUS = 2.4
export const DEFAULT_GLOBE_YAW = -0.55
const LOCAL_TEXTURES = '/assets/textures'
const tex = (file: string) => `${LOCAL_TEXTURES}/${file}`

const OFFLINE_EARTH = {
  day: tex('earth_day_2048.jpg'),
  clouds4k: tex('earth_clouds_2048.png'),
  clouds1k: tex('earth_clouds_1024.png'),
  normal: tex('earth_normal_2048.jpg'),
  specular: tex('earth_specular_2048.jpg'),
  night: tex('earth_night_2048.png'),
} as const

const KEY_LIGHT_POSITION: [number, number, number] = [5.2, 2.8, 5.6]
const KEY_LIGHT_DIRECTION = new THREE.Vector3(...KEY_LIGHT_POSITION).normalize()

export type QualityTier = 'high' | 'medium' | 'low'

function detectQualityTier(): QualityTier {
  if (typeof document === 'undefined') return 'low'
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return 'low'
    const webgl = gl as WebGLRenderingContext
    const maxTex = webgl.getParameter(webgl.MAX_TEXTURE_SIZE) || 2048
    const cores = navigator.hardwareConcurrency || 2
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    const saveData = conn?.saveData === true
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')

    if (saveData || maxTex < 4096 || memory <= 2) return 'low'
    if (mobile) return cores >= 6 && memory >= 4 ? 'medium' : 'low'
    if (cores >= 8 && memory >= 8) return 'high'
    if (cores >= 4 && memory >= 4) return 'medium'
    return 'low'
  } catch {
    return 'low'
  }
}

interface QualityPreset {
  segments: number
  dpr: number
  anisotropy: number
  starCount: number
  lit: boolean
  day: string[]
  clouds: string[]
  normal: string[]
  specular: string[]
  night: string[]
  features: {
    clouds: boolean
    normal: boolean
    specular: boolean
    night: boolean
    animatedArcs: boolean
  }
}

const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  high: {
    segments: 256,
    dpr: 3,
    anisotropy: 16,
    starCount: 1800,
    lit: true,
    day: [OFFLINE_EARTH.day],
    clouds: [OFFLINE_EARTH.clouds4k, OFFLINE_EARTH.clouds1k],
    normal: [OFFLINE_EARTH.normal],
    specular: [OFFLINE_EARTH.specular],
    night: [OFFLINE_EARTH.night],
    features: { clouds: true, normal: true, specular: true, night: true, animatedArcs: true },
  },
  medium: {
    segments: 128,
    dpr: 2,
    anisotropy: 16,
    starCount: 1200,
    lit: true,
    day: [OFFLINE_EARTH.day],
    clouds: [OFFLINE_EARTH.clouds1k],
    normal: [],
    specular: [OFFLINE_EARTH.specular],
    night: [OFFLINE_EARTH.night],
    features: { clouds: true, normal: false, specular: true, night: true, animatedArcs: true },
  },
  low: {
    segments: 96,
    dpr: 1.5,
    anisotropy: 8,
    starCount: 700,
    lit: false,
    day: [OFFLINE_EARTH.day],
    clouds: [],
    normal: [],
    specular: [],
    night: [],
    features: { clouds: false, normal: false, specular: false, night: false, animatedArcs: false },
  },
}

const ATMOS_VERT = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const ATMOS_FRAG = `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float power;
  uniform vec3 sunDir;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 N = normalize(vWorldNormal);
    float rim = pow(1.0 - abs(dot(N, V)), power);
    float sunside = smoothstep(-0.35, 0.85, dot(N, sunDir));
    float lit = mix(0.55, 1.0, sunside);
    gl_FragColor = vec4(glowColor, clamp(rim * intensity * lit, 0.0, 1.0));
  }
`

const NIGHT_LIGHTS_VERT = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const NIGHT_LIGHTS_FRAG = `
  uniform sampler2D nightMap;
  uniform vec3 lightDirection;
  uniform vec3 cityColor;
  uniform float opacity;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float daylight = dot(N, normalize(lightDirection));
    float nightSide = 1.0 - smoothstep(-0.18, 0.34, daylight);
    float limbFade = smoothstep(0.04, 0.5, dot(N, V));
    vec3 lights = texture2D(nightMap, vUv).rgb;
    float luma = dot(lights, vec3(0.299, 0.587, 0.114));
    float alpha = clamp(pow(luma, 0.85) * nightSide * limbFade * opacity, 0.0, 0.72);
    gl_FragColor = vec4(lights * cityColor * 1.35, alpha);
  }
`

export interface GlobeClientMarker {
  id: string
  lat: number
  lng: number
  color: string
  pulse?: boolean
}

export interface GlobeHomeBase {
  lat: number
  lng: number
}

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

function configureTexture(texture: THREE.Texture, { srgb = false, anisotropy = 8 } = {}) {
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
}

function loadFirstAvailable(urls: string[], options: Parameters<typeof configureTexture>[1]) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    let index = 0
    const attempt = () => {
      if (index >= urls.length) {
        reject(new Error('all sources failed'))
        return
      }
      loader.load(
        urls[index++],
        (texture) => {
          configureTexture(texture, options)
          resolve(texture)
        },
        undefined,
        attempt,
      )
    }
    attempt()
  })
}

function loadOptionalTexture(urls: string[], options: Parameters<typeof configureTexture>[1]) {
  if (!urls.length) return Promise.resolve<THREE.Texture | null>(null)
  return loadFirstAvailable(urls, options).catch(() => null)
}

class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

function AtmosphereGlow({
  radius,
  color,
  intensity,
  power,
}: {
  radius: number
  color: string
  intensity: number
  power: number
}) {
  const uniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color(color) },
      intensity: { value: intensity },
      power: { value: power },
      sunDir: { value: KEY_LIGHT_DIRECTION.clone() },
    }),
    [color, intensity, power],
  )

  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 48]} />
      <shaderMaterial
        vertexShader={ATMOS_VERT}
        fragmentShader={ATMOS_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function CloudLayer({ cloudMap, segments }: { cloudMap: THREE.Texture; segments: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const seg = Math.max(Math.round(segments * 0.75), 96)

  useFrame(({ clock }) => {
    if (meshRef.current) meshRef.current.rotation.y = clock.getElapsedTime() * 0.012
  })

  return (
    <mesh ref={meshRef} renderOrder={3}>
      <sphereGeometry args={[EARTH_RADIUS + 0.018, seg, seg]} />
      <meshPhongMaterial
        map={cloudMap}
        alphaMap={cloudMap}
        color="#f2fbff"
        transparent
        opacity={0.24}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        shininess={8}
        toneMapped={false}
      />
    </mesh>
  )
}

function NightLightsLayer({ nightMap }: { nightMap: THREE.Texture }) {
  const uniforms = useMemo(
    () => ({
      nightMap: { value: nightMap },
      lightDirection: { value: KEY_LIGHT_DIRECTION.clone() },
      cityColor: { value: new THREE.Color('#ffd79a') },
      opacity: { value: 0.78 },
    }),
    [nightMap],
  )

  return (
    <mesh renderOrder={2}>
      <sphereGeometry args={[EARTH_RADIUS + 0.01, 128, 128]} />
      <shaderMaterial
        vertexShader={NIGHT_LIGHTS_VERT}
        fragmentShader={NIGHT_LIGHTS_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

function ClientGlobeMarker({
  marker,
  index,
  onSelect,
}: {
  marker: GlobeClientMarker
  index: number
  onSelect?: (id: string) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const position = useMemo(
    () => latLonToVector3(marker.lat, marker.lng, EARTH_RADIUS + 0.018),
    [marker.lat, marker.lng],
  )

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const pulse = marker.pulse
      ? 1 + Math.sin(clock.getElapsedTime() * 2.4 + index * 0.6) * 0.18
      : 1
    meshRef.current.scale.setScalar(pulse)
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      renderOrder={10}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(marker.id)
      }}
    >
      <sphereGeometry args={[0.038, 12, 12]} />
      <meshBasicMaterial color={marker.color} toneMapped={false} />
    </mesh>
  )
}

function HomeBaseMarker({ home }: { home: GlobeHomeBase }) {
  const ringRef = useRef<THREE.Mesh>(null)
  const position = useMemo(
    () => latLonToVector3(home.lat, home.lng, EARTH_RADIUS + 0.02),
    [home.lat, home.lng],
  )
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    const dir = position.clone().normalize()
    return new THREE.Quaternion().setFromUnitVectors(up, dir)
  }, [position])

  useFrame(({ clock }) => {
    if (!ringRef.current) return
    const s = 1 + Math.sin(clock.getElapsedTime() * 2.2) * 0.25
    ringRef.current.scale.setScalar(s)
  })

  return (
    <group position={position} quaternion={quaternion} renderOrder={20}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.12, 8]} />
        <meshBasicMaterial color="#176fb4" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#176fb4" toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.075, 24]} />
        <meshBasicMaterial color="#5ad4ff" transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

interface EarthTextureSet {
  day: THREE.Texture
  clouds: THREE.Texture | null
  normal: THREE.Texture | null
  specular: THREE.Texture | null
  night: THREE.Texture | null
}

function TexturedEarth({
  baseYaw,
  quality,
  markers,
  homeBase,
  onMarkerSelect,
  onError,
  onReady,
}: {
  baseYaw: number
  quality: QualityPreset
  markers: GlobeClientMarker[]
  homeBase?: GlobeHomeBase
  onMarkerSelect?: (id: string) => void
  onError?: () => void
  onReady?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const earthMeshRef = useRef<THREE.Mesh>(null)
  const fadeRef = useRef(0)
  const { gl } = useThree()
  const anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), quality.anisotropy)
  const normalScale = useMemo(() => new THREE.Vector2(0.6, 0.6), [])
  const [textures, setTextures] = useState<EarthTextureSet | null>(null)

  useEffect(() => {
    let cancelled = false
    const { features } = quality
    loadFirstAvailable(quality.day, { srgb: true, anisotropy })
      .then((day) => {
        if (cancelled) return
        setTextures({ day, clouds: null, normal: null, specular: null, night: null })
        onReady?.()

        void Promise.all([
          features.clouds ? loadOptionalTexture(quality.clouds, { srgb: true, anisotropy }) : Promise.resolve(null),
          features.normal ? loadOptionalTexture(quality.normal, { anisotropy }) : Promise.resolve(null),
          features.specular ? loadOptionalTexture(quality.specular, { anisotropy }) : Promise.resolve(null),
          features.night ? loadOptionalTexture(quality.night, { srgb: true, anisotropy }) : Promise.resolve(null),
        ]).then(([clouds, normal, specular, night]) => {
          if (cancelled) return
          setTextures((current) => (current ? { ...current, clouds, normal, specular, night } : current))
        })
      })
      .catch(() => {
        if (!cancelled) onError?.()
      })
    return () => {
      cancelled = true
    }
  }, [anisotropy, onError, onReady, quality])

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y = baseYaw
    const mesh = earthMeshRef.current
    if (textures && mesh && fadeRef.current < 1) {
      fadeRef.current = Math.min(1, fadeRef.current + delta / 0.9)
      const mat = mesh.material as THREE.Material & { opacity: number }
      mat.opacity = fadeRef.current
    }
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshBasicMaterial color="#11314e" toneMapped={false} />
      </mesh>
      {textures ? (
        <>
          <mesh ref={earthMeshRef} renderOrder={1}>
            <sphereGeometry args={[EARTH_RADIUS + 0.004, quality.segments, quality.segments]} />
            {quality.lit ? (
              <meshPhongMaterial
                map={textures.day}
                normalMap={textures.normal ?? undefined}
                normalScale={normalScale}
                specularMap={textures.specular ?? undefined}
                specular="#9bdfff"
                shininess={22}
                emissive="#061b35"
                emissiveIntensity={0.36}
                toneMapped={false}
                transparent
                opacity={0}
                depthWrite={false}
              />
            ) : (
              <meshBasicMaterial map={textures.day} toneMapped={false} transparent opacity={0} depthWrite={false} />
            )}
          </mesh>
          {textures.night ? <NightLightsLayer nightMap={textures.night} /> : null}
          {textures.clouds ? <CloudLayer cloudMap={textures.clouds} segments={quality.segments} /> : null}
        </>
      ) : null}
      {markers.map((marker, index) => (
        <ClientGlobeMarker key={marker.id} marker={marker} index={index} onSelect={onMarkerSelect} />
      ))}
      {homeBase ? <HomeBaseMarker home={homeBase} /> : null}
    </group>
  )
}

function FallbackEarth({
  baseYaw,
  markers,
  homeBase,
  onMarkerSelect,
}: {
  baseYaw: number
  markers: GlobeClientMarker[]
  homeBase?: GlobeHomeBase
  onMarkerSelect?: (id: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y = baseYaw
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
        <meshBasicMaterial color={0x2d6a9f} toneMapped={false} />
      </mesh>
      {markers.map((marker, index) => (
        <ClientGlobeMarker key={marker.id} marker={marker} index={index} onSelect={onMarkerSelect} />
      ))}
      {homeBase ? <HomeBaseMarker home={homeBase} /> : null}
      <AtmosphereGlow radius={EARTH_RADIUS + 0.06} color="#4ac8ff" intensity={0.45} power={5.0} />
    </group>
  )
}

/** Randomised point-cloud starfield — native Three.js, no drei. */
function StarField({ count, radius = 180 }: { count: number; radius?: number }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (0.7 + Math.random() * 0.3)
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [count, radius])

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.35} color="#cce8ff" sizeAttenuation transparent opacity={0.75} />
    </points>
  )
}

/** R3F wrapper around Three.js built-in OrbitControls — no drei. */
function GlobeControls({
  enableRotate,
  enableZoom,
  autoRotate,
}: {
  enableRotate: boolean
  enableZoom: boolean
  autoRotate: boolean
}) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<ThreeOrbitControls | null>(null)

  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement)
    controls.enableRotate    = enableRotate
    controls.enablePan       = false
    controls.enableZoom      = enableZoom
    controls.enableDamping   = true
    controls.dampingFactor   = 0.08
    controls.rotateSpeed     = 0.45
    controls.autoRotate      = autoRotate
    controls.autoRotateSpeed = 0.32
    controls.minDistance     = 3.2
    controls.maxDistance     = 8
    controls.minPolarAngle   = Math.PI * 0.12
    controls.maxPolarAngle   = Math.PI * 0.88
    controlsRef.current      = controls
    return () => controls.dispose()
  }, [camera, gl, enableRotate, enableZoom, autoRotate])

  useFrame(() => controlsRef.current?.update())
  return null
}

function GlobeScene({
  baseYaw,
  quality,
  markers,
  homeBase,
  onMarkerSelect,
  enableRotate,
  enableZoom,
  autoRotate,
  starCount,
  onReady,
}: {
  baseYaw: number
  quality: QualityPreset
  markers: GlobeClientMarker[]
  homeBase?: GlobeHomeBase
  onMarkerSelect?: (id: string) => void
  enableRotate: boolean
  enableZoom: boolean
  autoRotate: boolean
  starCount: number
  onReady?: () => void
}) {
  const { scene } = useThree()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    scene.background = null
  }, [scene])

  const fallback = (
    <FallbackEarth baseYaw={baseYaw} markers={markers} homeBase={homeBase} onMarkerSelect={onMarkerSelect} />
  )

  const stars = Math.min(starCount, quality.starCount)

  return (
    <>
      {quality.lit ? (
        <>
          <ambientLight color="#8fc8ff" intensity={1.3} />
          <directionalLight position={KEY_LIGHT_POSITION} color="#f5fbff" intensity={1.7} />
          <pointLight position={[-5.5, -1.4, -3.2]} color="#176fb4" intensity={0.85} distance={11} />
        </>
      ) : null}
      <StarField count={stars} />
      <GlobeControls enableRotate={enableRotate} enableZoom={enableZoom} autoRotate={autoRotate} />
      <SceneErrorBoundary fallback={fallback}>
        {failed ? (
          fallback
        ) : (
          <TexturedEarth
            baseYaw={baseYaw}
            quality={quality}
            markers={markers}
            homeBase={homeBase}
            onMarkerSelect={onMarkerSelect}
            onError={() => {
              setFailed(true)
              onReady?.()
            }}
            onReady={onReady}
          />
        )}
      </SceneErrorBoundary>
      <AtmosphereGlow radius={EARTH_RADIUS + 0.055} color="#8ad8ff" intensity={0.54} power={6.0} />
      <AtmosphereGlow radius={EARTH_RADIUS + 0.16} color="#1a5fff" intensity={0.18} power={3.3} />
      <CloudInfrastructureLayer animated={quality.features.animatedArcs} />
    </>
  )
}

export function GlobeStaticFallback({ className }: { className?: string }) {
  return (
    <div
      className={className ?? 'h-full w-full'}
      style={{
        background:
          'radial-gradient(circle at 50% 42%, rgba(23,111,180,0.18) 0%, rgba(23,111,180,0.06) 48%, transparent 78%)',
      }}
    />
  )
}

export function EarthGlobeCanvas({
  className,
  markers = [],
  homeBase,
  focus,
  onMarkerSelect,
  enableRotate = false,
  enableZoom = false,
  autoRotate = true,
  starCount = 1600,
  cameraDistance = 4.5,
  qualityTier = 'auto',
  onReady,
}: {
  className?: string
  markers?: GlobeClientMarker[]
  homeBase?: GlobeHomeBase
  focus?: { lat: number; lng: number }
  onMarkerSelect?: (id: string) => void
  enableRotate?: boolean
  enableZoom?: boolean
  autoRotate?: boolean
  starCount?: number
  cameraDistance?: number
  qualityTier?: 'auto' | QualityTier
  onReady?: () => void
}) {
  const webglOk = useMemo(() => isWebGLAvailable(), [])
  const tier = useMemo<QualityTier>(
    () => (qualityTier === 'auto' ? detectQualityTier() : qualityTier),
    [qualityTier],
  )
  const quality = QUALITY_PRESETS[tier]

  const cameraPos = useMemo<[number, number, number]>(() => {
    if (focus) {
      const v = latLonToVector3(focus.lat, focus.lng, cameraDistance)
      return [v.x, v.y, v.z]
    }
    return [0, 0, cameraDistance]
  }, [focus, cameraDistance])

  const baseYaw = focus ? 0 : DEFAULT_GLOBE_YAW

  useEffect(() => {
    if (!webglOk) onReady?.()
  }, [webglOk, onReady])

  if (!webglOk) return <GlobeStaticFallback className={className} />

  return (
    <Canvas
      camera={{ position: cameraPos, fov: 42 }}
      gl={{
        antialias: tier !== 'low',
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.08,
      }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      dpr={[1, quality.dpr]}
      performance={{ min: 0.5 }}
      frameloop="always"
      className={className ?? 'h-full w-full'}
    >
      <GlobeScene
        baseYaw={baseYaw}
        quality={quality}
        markers={markers}
        homeBase={homeBase}
        onMarkerSelect={onMarkerSelect}
        enableRotate={enableRotate}
        enableZoom={enableZoom}
        autoRotate={autoRotate}
        starCount={starCount}
        onReady={onReady}
      />
    </Canvas>
  )
}
