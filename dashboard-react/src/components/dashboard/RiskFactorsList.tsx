import { AlertCircle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { cn } from "../../lib/utils"
import type { RiskFactor } from "../../types"

interface RiskFactorsListProps { factors: RiskFactor[] }

function weightColor(w: number): { bg: string; text: string; bar: string } {
  if (w > 0.5) return { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", bar: "bg-red-500" }
  if (w > 0.3) return { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", bar: "bg-amber-500" }
  return { bg: "bg-dark-800/50 border-dark-700/50", text: "text-dark-400", bar: "bg-dark-500" }
}

export default function RiskFactorsList({ factors }: RiskFactorsListProps) {
  if (factors.length === 0) return null

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <CardTitle className="uppercase tracking-[0.22em] text-slate-300">Facteurs de risque</CardTitle>
        <AlertCircle size={16} className="text-amber-300" />
      </CardHeader>
      <CardContent className="space-y-3">
        {factors.map((rf, i) => {
          const c = weightColor(rf.weight)
          return (
            <div key={i} className={cn("p-3 rounded-2xl border transition-all", c.bg)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{rf.name}</span>
                <span className={cn("text-xs font-bold font-mono", c.text)}>{(rf.weight * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-slate-400 leading-6">{rf.description}</p>
              <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", c.bar)} style={{ width: `${rf.weight * 100}%` }} />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
