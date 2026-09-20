import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonVariant = "primary" | "destructive" | "outline" | "ghost" | "success"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: "sm" | "md" | "lg"
  children: ReactNode
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 shadow-lg shadow-sky-500/20",
  destructive: "bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-lg shadow-rose-600/20",
  outline: "border border-slate-700/80 hover:border-slate-500 hover:bg-slate-800/70 text-slate-200",
  ghost: "hover:bg-slate-800/70 text-slate-300 hover:text-white",
  success: "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/15",
}
const sizeStyles: Record<string, string> = {
  sm: "px-2.5 py-1 text-[11px] gap-1.5 rounded-md min-h-[31px]",
  md: "px-3 py-1.5 text-sm gap-2 rounded-md min-h-[36px]",
  lg: "px-4 py-2 text-sm gap-2 rounded-lg min-h-[40px]",
}

export function Button({
  variant = "primary", size = "md", children, leftIcon, rightIcon, className, disabled, loading = false, ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "active:scale-[0.98] cursor-pointer",
        "ring-offset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60",
        variantStyles[variant], sizeStyles[size], className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin shrink-0" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
