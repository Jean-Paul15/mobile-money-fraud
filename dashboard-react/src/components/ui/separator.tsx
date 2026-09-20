import { cn } from "../../lib/utils"
import type { HTMLAttributes } from "react"

interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  variant?: "default" | "subtle" | "accent"
}

export function Separator({
  className,
  orientation = "horizontal",
  variant = "default",
  ...props
}: SeparatorProps) {
  const variants: Record<string, string> = {
    default: "bg-dark-700/60",
    subtle: "bg-dark-700/30",
    accent: "bg-accent/30",
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "w-px h-full",
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
