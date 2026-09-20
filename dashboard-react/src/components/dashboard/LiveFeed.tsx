import { cn } from "../../lib/utils"
import { formatCurrency } from "../../lib/utils"
import type { Transaction } from "../../types"

interface LiveFeedProps {
  transactions: Transaction[]
  onSelect: (tx: Transaction) => void
  selectedId?: string
}

function ScorePill({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  if (score >= 0.7)
    return <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 tabular-nums">{pct}%</span>
  if (score >= 0.5)
    return <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 tabular-nums">{pct}%</span>
  return <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 tabular-nums">{pct}%</span>
}

function ChannelDot({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    mobile_app: "bg-blue-400",
    agent: "bg-purple-400",
    web: "bg-cyan-400",
    ussd: "bg-amber-400",
  }
  return (
    <span
      className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", colors[channel] ?? "bg-slate-500")}
      title={channel}
    />
  )
}

export default function LiveFeed({ transactions, onSelect, selectedId }: LiveFeedProps) {
  const recent = transactions.slice(0, 16)

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0c1220]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-blink-dot" />
          <span className="text-sm font-semibold text-white">Flux temps réel</span>
        </div>
        <span className="text-[11px] text-slate-500 tabular-nums">{transactions.length} événements</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 border-b border-white/6 shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-slate-600">Émetteur</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-600">Montant</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-600 text-right">Score</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {recent.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[120px]">
            <span className="text-sm text-slate-600">En attente de données…</span>
          </div>
        ) : (
          recent.map((tx) => (
            <button
              key={tx.id}
              onClick={() => onSelect(tx)}
              className={cn(
                "w-full grid grid-cols-[1fr_auto_auto] gap-2 items-start px-4 py-2.25",
                "border-b border-white/4 text-left transition-colors duration-100",
                "hover:bg-white/4 active:bg-white/6",
                selectedId === tx.id
                  ? "bg-blue-500/8 border-l-2 border-l-blue-500 pl-3.5"
                  : "border-l-2 border-l-transparent",
              )}
            >
              {/* Sender info */}
              <div className="flex items-start gap-2 min-w-0">
                <ChannelDot channel={tx.channel} />
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-slate-200 truncate leading-tight">
                    {tx.customer.name}
                  </div>
                  <div className="text-[10px] text-slate-600 truncate leading-tight">
                    {tx.customer.city} · {tx.type}
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="text-[12px] font-semibold text-white tabular-nums text-right">
                {formatCurrency(tx.amount)}
              </div>

              {/* Score */}
              <div className="flex justify-end">
                <ScorePill score={tx.score} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
