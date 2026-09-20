import { useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts"
import type { Transaction } from "../../types"

interface ScoreChartProps { transactions: Transaction[] }

const TOOLTIP_STYLE = {
  backgroundColor: "#0c1220",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#e2e8f0",
  padding: "8px 12px",
}

function barColor(midScore: number) {
  if (midScore >= 0.7) return "#ef4444"
  if (midScore >= 0.5) return "#f59e0b"
  return "#10b981"
}

function computeBuckets(txs: Transaction[]) {
  const buckets = Array.from({ length: 10 }, () => 0)
  for (const tx of txs) buckets[Math.min(9, Math.floor(tx.score * 10))]++
  return buckets.map((count, i) => ({
    label: `${i * 10}–${(i + 1) * 10}`,
    count,
    midScore: (i * 10 + 5) / 100,
  }))
}

export default function ScoreChart({ transactions }: ScoreChartProps) {
  const data = useMemo(() => computeBuckets(transactions), [transactions])

  return (
    <div className="rounded-xl border border-white/8 bg-[#0c1220] p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-600 font-medium">Distribution</div>
          <div className="text-sm font-semibold text-white mt-0.5">Scores de risque</div>
        </div>
        <div className="flex items-center gap-3">
          {[
            { color: "bg-emerald-500", label: "<50" },
            { color: "bg-amber-500", label: "50–70" },
            { color: "bg-red-500", label: ">70" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-sm ${item.color} opacity-80`} />
              <span className="text-[10px] text-slate-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#64748b", marginBottom: 4, fontSize: 11 }}
            formatter={(v) => [`${v} tx`, "Nombre"]}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <ReferenceLine
            x="50–60"
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="3 3"
            label={{ value: "seuil", position: "top", fill: "#f59e0b", fontSize: 9 }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {data.map((d) => (
              <Cell key={d.label} fill={barColor(d.midScore)} fillOpacity={0.75} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
