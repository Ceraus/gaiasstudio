import { useEffect, useId, useState } from 'react'

/**
 * Detects the user's "reduce motion" accessibility preference and keeps it in
 * sync. When enabled we render a calm, static gradient instead of animating.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return reduced
}

export type AnimatedCommandLogoProps = {
  /** Rendered width/height in pixels (the mark is square). */
  size?: number
  className?: string
  /** Gradient start colour (top-left). */
  fromColor?: string
  /** Gradient end colour (bottom-right). */
  toColor?: string
  /** Brighter highlight colour used for the sweeping gleam. */
  gleamColor?: string
  /** Stroke thickness in viewBox units (24×24 space). */
  strokeWidth?: number
  /** Seconds for one full gradient drift cycle. */
  driftDuration?: number
  /** Seconds between each gleam sweep (including the rest gap). */
  gleamDuration?: number
  /** Soft outer glow behind the mark. */
  glow?: boolean
  /** Force-disable animation regardless of system preference. */
  paused?: boolean
  title?: string
}

/**
 * A premium, lightly-animated rendering of the ⌘ command mark.
 *
 * Two effects combine for a high-end feel:
 *  1. A slow gradient "drift" that gently shifts the cyan→blue ramp so the
 *     colour feels alive rather than flat.
 *  2. A periodic specular "gleam" — a narrow highlight band that sweeps
 *     diagonally across the stroke, like light catching brushed metal.
 *
 * Everything is pure SVG + SMIL, so it is GPU-friendly, dependency-free and
 * works inside React 19. Motion is automatically disabled for users who
 * request reduced motion.
 */
export function AnimatedCommandLogo({
  size = 96,
  className,
  fromColor = '#22D3EE',
  toColor = '#1D4ED8',
  gleamColor = '#E0FBFF',
  strokeWidth = 2,
  driftDuration = 7,
  gleamDuration = 4.5,
  glow = true,
  paused = false,
  title = 'Clearplan Command',
}: AnimatedCommandLogoProps) {
  const reducedMotion = usePrefersReducedMotion()
  const animate = !paused && !reducedMotion

  // Unique ids so multiple instances never collide.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const gradId = `cmdGrad-${uid}`
  const gleamId = `cmdGleam-${uid}`
  const glowId = `cmdGlow-${uid}`
  const maskId = `cmdMask-${uid}`

  // The ⌘ command glyph as a single continuous stroke.
  const COMMAND_PATH =
    'M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3'

  // The gleam band travels along this diagonal; the offsets keep it parked
  // off-canvas for most of the cycle so the flash feels deliberate, not busy.
  const gleamFrom = '-18 -18'
  const gleamTo = '18 18'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        {/* Base ramp. A subtle drift on the gradient transform makes the
            colour breathe without ever looking like it is "spinning". */}
        <linearGradient
          id={gradId}
          x1="3"
          y1="3"
          x2="21"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={fromColor}>
            {animate && (
              <animate
                attributeName="stop-color"
                values={`${fromColor};${toColor};${fromColor}`}
                dur={`${driftDuration}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.5;1"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              />
            )}
          </stop>
          <stop offset="100%" stopColor={toColor}>
            {animate && (
              <animate
                attributeName="stop-color"
                values={`${toColor};${fromColor};${toColor}`}
                dur={`${driftDuration}s`}
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.5;1"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              />
            )}
          </stop>
          {animate && (
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="-2 -2;2 2;-2 -2"
              dur={`${driftDuration * 1.6}s`}
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              additive="sum"
            />
          )}
        </linearGradient>

        {/* The gleam: a narrow bright band, transparent on both sides, that
            slides diagonally across the artwork. */}
        <linearGradient
          id={gleamId}
          x1="0"
          y1="0"
          x2="10"
          y2="10"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={gleamColor} stopOpacity="0" />
          <stop offset="42%" stopColor={gleamColor} stopOpacity="0" />
          <stop offset="50%" stopColor={gleamColor} stopOpacity="0.95" />
          <stop offset="58%" stopColor={gleamColor} stopOpacity="0" />
          <stop offset="100%" stopColor={gleamColor} stopOpacity="0" />
          {animate && (
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values={`${gleamFrom};${gleamTo};${gleamTo}`}
              keyTimes="0;0.45;1"
              dur={`${gleamDuration}s`}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.5 0 0.2 1;0 0 1 1"
            />
          )}
        </linearGradient>

        {glow && (
          <filter
            id={glowId}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}

        {/* Restrict the gleam to the stroke shape so the highlight rides the
            glyph instead of forming a rectangle over it. */}
        <mask id={maskId}>
          <path
            d={COMMAND_PATH}
            stroke="#fff"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>

      {/* Soft glow underlay — gently pulses for depth. */}
      {glow && (
        <path
          d={COMMAND_PATH}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
          opacity={0.55}
        >
          {animate && (
            <animate
              attributeName="opacity"
              values="0.35;0.65;0.35"
              dur={`${driftDuration}s`}
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
            />
          )}
        </path>
      )}

      {/* Crisp main stroke. */}
      <path
        d={COMMAND_PATH}
        stroke={`url(#${gradId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Specular gleam, clipped to the stroke. */}
      <g mask={`url(#${maskId})`} style={{ mixBlendMode: 'screen' }}>
        <rect x="0" y="0" width="24" height="24" fill={`url(#${gleamId})`} />
      </g>
    </svg>
  )
}

export default AnimatedCommandLogo
