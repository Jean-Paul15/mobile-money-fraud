import { useMemo } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import type { Transaction } from "../../types"

interface AlertTimelineProps { transactions: Transaction[] }

const TOOLTIP_STYLE = {
  backgroundColor: "#0c1220",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#e2e8f0",
  padding: "8px 12px",
}

function computeData(txs: Transaction[]) {
  if (txs.length === 0) return []
  const recent = [...txs].reverse().slice(-50)
  return recent.map((tx, i, arr) => {
    const window = arr.slice(Math.max(0, i - 4), i + 1)
    const avg = window.reduce((s, t) => s + t.score, 0) / window.length
    return { i: i + 1, score: tx.score, avg }
  })
}

export default function AlertTimeline({ transactions }: AlertTimelineProps) {
  const data = useMemo(() => computeData(transactions), [transactions])

  return (
    <div className="rounded-xl border border-white/8 bg-[#0c1220] p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-600 font-medium">Tendance</div>
          <div className="text-sm font-semibold text-white mt-0.5">Évolution des scores</div>
        </div>
        {data.length === 0 && (
          <span className="text-[11px] text-slate-600">En attente…</span>
        )}
        <div className="flex items-center gap-3">
          {[
            { color: "border-blue-500", label: "Score" },
            { color: "border-emerald-500", label: "Moy. 5" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-4 border-t ${item.color}`} />
              <span className="text-[10px] text-slate-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="i"
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#64748b", fontSize: 11 }}
            formatter={(v) => [`${Math.round(Number(v) * 100)}%`, ""]}
            labelFormatter={(l) => `#${l}`}
            cursor={{ stroke: "rgba(255,255,255,0.08)" }}
          />
          <ReferenceLine
            y={0.5}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="3 3"
            label={{ value: "50%", position: "right", fill: "#f59e0b", fontSize: 9 }}
          />
          <Line
            type="monotone"
            dataKey="score"
            name="Score"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "#3b82f6" }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            name="Moy. 5"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "#10b981" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
