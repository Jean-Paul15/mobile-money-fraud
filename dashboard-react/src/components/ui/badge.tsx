import { cn } from "../../lib/utils"
import type { HTMLAttributes } from "react"

export type BadgeVariant = "critical" | "high" | "medium" | "low" | "success" | "accepted" | "blocked" | "pending"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant
  pulse?: boolean
  dot?: boolean
}

const styles: Record<BadgeVariant, string> = {
  critical: "bg-rose-500/15 text-rose-300 border-rose-400/25",
  high: "bg-orange-500/15 text-orange-300 border-orange-400/25",
  medium: "bg-amber-500/15 text-amber-300 border-amber-400/25",
  low: "bg-slate-500/15 text-slate-300 border-slate-400/25",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
  accepted: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
  blocked: "bg-rose-500/15 text-rose-300 border-rose-400/25",
  pending: "bg-amber-500/15 text-amber-300 border-amber-400/25",
}
const dots: Record<BadgeVariant, string> = {
  critical: "bg-red-400", high: "bg-orange-400", medium: "bg-amber-400", low: "bg-slate-400",
  success: "bg-emerald-400", accepted: "bg-emerald-400", blocked: "bg-red-400", pending: "bg-amber-400",
}
const labels: Record<BadgeVariant, string> = {
  critical: "CRITIQUE", high: "HAUT", medium: "MOYEN", low: "BAS",
  success: "SUCCES", accepted: "ACCEPTE", blocked: "BLOQUE", pending: "EN ATTENTE",
}

export function Badge({ variant, pulse = false, dot = true, className, children, ...props }: BadgeProps) {
  const label = typeof children === "string" && children ? children : labels[variant]
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-[0.18em] uppercase border transition-all duration-200",
      styles[variant],
      pulse && variant === "critical" && "animate-pulse-critical",
      pulse && (variant === "high" || variant === "medium") && "animate-pulse-warning",
      className,
    )} {...props}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dots[variant])} />}
      {label}
    </span>
  )
}
