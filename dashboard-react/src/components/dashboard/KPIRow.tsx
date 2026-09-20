import { Activity, Shield, Percent, Gauge, ShieldOff } from "lucide-react"
import KpiCard from "./KpiCard"
import type { KPIData } from "../../types"

interface KPIRowProps {
  kpi: KPIData
  isRunning: boolean
}

export default function KPIRow({ kpi, isRunning }: KPIRowProps) {
  const blockedShare =
    kpi.totalScanned > 0 ? ((kpi.fraudBlocked / kpi.totalScanned) * 100).toFixed(2) : "0.00"

  const cards = [
    {
      title: "Transactions scannées",
      value: kpi.totalScanned.toLocaleString("fr-FR"),
      subtitle: "total analysé",
      icon: Activity,
      accentClass: "border-l-blue-500/60",
    },
    {
      title: "Fraudes détectées",
      value: kpi.fraudDetected.toLocaleString("fr-FR"),
      subtitle: `dont ${kpi.fraudBlocked} bloquées`,
      icon: Shield,
      accentClass: "border-l-amber-500/60",
    },
    {
      title: "Taux de détection",
      value: `${kpi.detectionRate.toFixed(1)}%`,
      subtitle: `score moyen ${(kpi.avgScore * 100).toFixed(0)}%`,
      icon: Percent,
      accentClass: "border-l-cyan-500/60",
    },
    {
      title: "Latence scoring",
      value: `${kpi.avgSpeedMs.toFixed(0)} ms`,
      subtitle: "temps moyen par tx",
      icon: Gauge,
      accentClass: "border-l-emerald-500/60",
    },
    {
      title: "Tx bloquées",
      value: kpi.fraudBlocked.toLocaleString("fr-FR"),
      subtitle: `${blockedShare}% du flux`,
      icon: ShieldOff,
      accentClass: "border-l-red-500/60",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} isRunning={isRunning} />
      ))}
    </div>
  )
}
