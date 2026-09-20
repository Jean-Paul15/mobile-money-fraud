import { Activity } from "lucide-react"

interface QuickKpiProps {
  icon: typeof Activity
  label: string
  value: string
  color: string
}

export default function QuickKpi({ icon: Icon, label, value, color }: QuickKpiProps) {
  return (
    <div className="flex flex-col items-center gap-1 px-2.5 py-2.5 rounded-md bg-slate-950/55 border border-white/7">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 border border-white/7">
        <Icon size={12} className={color} />
      </span>
      <span className="text-[12px] font-bold text-white font-mono tabular-nums leading-none">{value}</span>
      <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500">{label}</span>
    </div>
  )
}
