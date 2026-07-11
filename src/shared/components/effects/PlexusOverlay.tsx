import { useEffect, useRef, useState } from 'react'

const DEFAULT_NODE_COUNT = 42
const DEFAULT_LINK_DIST = 118
const DEFAULT_COLOR = '41, 182, 255'

function parseColor(input?: string): string {
  if (!input) return DEFAULT_COLOR
  if (input.startsWith('#')) {
    const hex = input.slice(1)
    const normalized =
      hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
    const value = Number.parseInt(normalized, 16)
    if (Number.isNaN(value)) return DEFAULT_COLOR
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`
  }
  const parts = input.match(/\d+/g)
  if (parts && parts.length >= 3) return `${parts[0]}, ${parts[1]}, ${parts[2]}`
  return DEFAULT_COLOR
}

export function PlexusOverlay({
  className = '',
  nodeCount = DEFAULT_NODE_COUNT,
  linkDist = DEFAULT_LINK_DIST,
  opacity = 0.85,
  intensity = 1,
  color,
  scale = 1,
}: {
  className?: string
  nodeCount?: number
  linkDist?: number
  opacity?: number
  intensity?: number
  color?: string
  scale?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const rgb = parseColor(color)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    let raf = 0
    let nodes: Array<{ x: number; y: number; vx: number; vy: number }> = []

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      nodes = Array.from({ length: nodeCount }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      }))
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const linkReach = linkDist * scale
      const dotRadius = 1.35 * scale
      const lineWidth = 0.85 * scale

      ctx.clearRect(0, 0, w, h)

      if (!reducedMotion) {
        nodes.forEach((n) => {
          n.x += n.vx
          n.y += n.vy
          if (n.x < 0 || n.x > w) n.vx *= -1
          if (n.y < 0 || n.y > h) n.vy *= -1
          n.x = Math.max(0, Math.min(w, n.x))
          n.y = Math.max(0, Math.min(h, n.y))
        })
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.hypot(dx, dy)
          if (dist < linkReach) {
            const alpha = (1 - dist / linkReach) * 0.18 * intensity
            ctx.strokeStyle = `rgba(${rgb}, ${alpha})`
            ctx.lineWidth = lineWidth
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      nodes.forEach((n) => {
        ctx.fillStyle = `rgba(${rgb}, ${0.38 * intensity})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, dotRadius, 0, Math.PI * 2)
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()

    // Use ResizeObserver so the canvas restarts whenever the sidebar CSS
    // transition changes the container width (window resize alone won't fire).
    const ro = new ResizeObserver(() => {
      resize()
    })
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [nodeCount, linkDist, intensity, rgb, scale, reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ zIndex: 0, opacity }}
      aria-hidden="true"
    />
  )
}
