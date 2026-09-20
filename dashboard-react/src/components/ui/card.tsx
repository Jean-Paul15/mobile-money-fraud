import { cn } from "../../lib/utils"
import type { HTMLAttributes, ReactNode } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: "default" | "glass" | "elevated"
  padding?: "none" | "sm" | "md" | "lg"
}
const paddingMap: Record<string, string> = { none: "p-0", sm: "p-2.5", md: "p-4", lg: "p-5" }

export function Card({ children, className, variant = "default", padding = "md", ...props }: CardProps) {
  const variants: Record<string, string> = {
    default: "surface-panel rounded-xl",
    glass: "glass-panel rounded-xl",
    elevated: "surface-panel rounded-xl shadow-2xl shadow-black/25",
  }
  return <div className={cn(variants[variant], paddingMap[padding], className)} {...props}>{children}</div>
}

interface SectionProps extends HTMLAttributes<HTMLDivElement> { children: ReactNode }

export function CardHeader({ children, className, ...props }: SectionProps) {
  return <div className={cn("flex items-center justify-between mb-4", className)} {...props}>{children}</div>
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold tracking-wide text-slate-100", className)} {...props}>{children}</h3>
}

export function CardContent({ children, className, ...props }: SectionProps) {
  return <div className={cn("", className)} {...props}>{children}</div>
}
