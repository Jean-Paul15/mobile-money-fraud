import { cn } from "../../lib/utils"

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

export default function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button onClick={onClick} className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200",
      active ? "bg-white/8 text-white shadow-sm shadow-black/15" : "text-slate-400 hover:text-white hover:bg-white/5",
    )}>
      {icon}{label}
    </button>
  )
}
