import type { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"

interface KpiCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  accentClass: string
  isRunning?: boolean
  trend?: "up" | "down" | "neutral"
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentClass,
  isRunning,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border border-white/8 bg-[#0c1220] p-4",
        "border-l-2",
        accentClass,
        isRunning && "animate-fade-in",
      )}
    >
      {/* Top row: label + icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 leading-none">
          {title}
        </span>
        <Icon size={13} className="text-slate-600 shrink-0" />
      </div>

      {/* Value */}
      <div className="text-[1.6rem] font-bold leading-none text-white tabular-nums font-mono tracking-tight">
        {value}
      </div>

      {/* Subtitle */}
      <div className="text-[11px] text-slate-500 leading-none">{subtitle}</div>
    </div>
  )
}
