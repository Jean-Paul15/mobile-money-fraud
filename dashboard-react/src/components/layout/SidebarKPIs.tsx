import { Activity, AlertTriangle, Percent, Clock } from "lucide-react"
import QuickKpi from "./QuickKpi"
import type { KPIData } from "../../types"

interface SidebarKPIsProps { kpi: KPIData }

export default function SidebarKPIs({ kpi }: SidebarKPIsProps) {
  return (
    <div className="px-4 py-3 space-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Indicateurs</span>
      <div className="grid grid-cols-2 gap-1.5">
        <QuickKpi icon={Activity} label="Scannes" value={kpi.totalScanned.toLocaleString("fr-FR")} color="text-accent-light" />
        <QuickKpi icon={AlertTriangle} label="Bloques" value={kpi.fraudBlocked.toLocaleString("fr-FR")} color="text-red-400" />
        <QuickKpi icon={Percent} label="Detection" value={`${kpi.detectionRate.toFixed(1)}%`} color="text-amber-400" />
        <QuickKpi icon={Clock} label="Vitesse" value={`${kpi.avgSpeedMs.toFixed(0)}ms`} color="text-emerald-400" />
      </div>
    </div>
  )
}
