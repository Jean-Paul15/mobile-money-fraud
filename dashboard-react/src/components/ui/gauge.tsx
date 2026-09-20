import { useEffect, useRef, useState } from "react"
import { cn, getScoreColor, getStatusLabel } from "../../lib/utils"

interface GaugeProps {
  value: number; size?: number; strokeWidth?: number
  className?: string; showLabel?: boolean; animated?: boolean
}

function GaugeArc({ cx, r, sw, cir, offset, glow, animated }: {
  cx: number; r: number; sw: number; cir: number; offset: number; glow: string; animated: boolean
}) {
  return (
    <circle cx={cx} cy={cx} r={r} fill="none" className={glow}
      strokeWidth={sw} strokeLinecap="round"
      strokeDasharray={cir} strokeDashoffset={offset}
      style={{ filter: glow, transition: animated ? "stroke-dashoffset 0.8s ease-out" : "none" }} />
  )
}

export function Gauge({ value, size = 140, strokeWidth = 10, className, showLabel = true, animated = true }: GaugeProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, value))
  const targetOffset = circumference - clamped * circumference
  const [displayOffset, setDisplayOffset] = useState(circumference)
  const prevValue = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => setDisplayOffset(targetOffset), animated ? 50 : 0)
    prevValue.current = value
    return () => clearTimeout(timer)
  }, [targetOffset, animated, value])

  const color = (() => {
    if (value >= 0.7) return { stroke: "stroke-red-400", glow: "drop-shadow(0 0 6px rgba(239,68,68,0.4))" }
    if (value >= 0.5) return { stroke: "stroke-amber-400", glow: "drop-shadow(0 0 6px rgba(245,158,11,0.4))" }
    return { stroke: "stroke-emerald-400", glow: "drop-shadow(0 0 6px rgba(16,185,129,0.4))" }
  })()
  const pct = Math.round(clamped * 100)

  return (
    <div className={cn("flex flex-col items-center gap-2", className)} role="img" aria-label={`Score de risque: ${pct} sur 100`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e1e28" strokeWidth={strokeWidth} />
          <GaugeArc cx={size / 2} r={radius} sw={strokeWidth} cir={circumference} offset={displayOffset}
            glow={color.glow} animated={animated} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-bold font-mono tabular-nums", getScoreColor(value))}>{pct}</span>
          <span className="text-[10px] text-dark-400 font-medium">/100</span>
        </div>
      </div>
      {showLabel && (
        <span className={cn("text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
          value >= 0.7 && "bg-red-500/15 text-red-400 border-red-500/30",
          value >= 0.5 && value < 0.7 && "bg-amber-500/15 text-amber-400 border-amber-500/30",
          value < 0.5 && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        )}>{getStatusLabel(value)}</span>
      )}
    </div>
  )
}
