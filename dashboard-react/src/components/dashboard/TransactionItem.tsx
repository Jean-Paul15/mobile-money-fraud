import { Badge } from "../ui/badge"
import { formatCurrency, formatTimestamp, formatScore } from "../../lib/utils"
import { TYPE_ICONS, TYPE_LABELS, CHANNEL_ICONS } from "../../lib/constants"
import type { Transaction } from "../../types"
import { cn } from "../../lib/utils"

interface TransactionItemProps { tx: Transaction; isSelected: boolean; onSelect: (tx: Transaction) => void; index: number }

function getBadge(score: number): { variant: "critical" | "medium" | "low"; label: string } {
  if (score >= 0.7) return { variant: "critical", label: "CRITIQUE" }
  if (score >= 0.5) return { variant: "medium", label: "SUSPECT" }
  return { variant: "low", label: "LEGITIME" }
}
function scoreColor(score: number) { return score >= 0.7 ? "text-red-400" : score >= 0.5 ? "text-amber-400" : "text-dark-400" }

export default function TransactionItem({ tx, isSelected, onSelect, index }: TransactionItemProps) {
  const TypeIcon = TYPE_ICONS[tx.type]; const ChannelIcon = CHANNEL_ICONS[tx.channel]
  const badge = getBadge(tx.score); const isFraud = tx.score >= 0.5
  const isCritical = tx.score >= 0.7; const hasFeedback = tx.feedback !== undefined && tx.feedback !== "pending"

  return (
    <button onClick={() => onSelect(tx)} className={cn(
      "w-full text-left px-4 py-3 transition-all duration-200 min-h-[56px] hover:bg-dark-800/80",
      isSelected && "bg-dark-800 ring-1 ring-accent/30",
      isCritical && !hasFeedback && "bg-red-500/5 border-l-2 border-l-red-500",
      isFraud && !isCritical && !hasFeedback && "bg-amber-500/3 border-l-2 border-l-amber-500",
      index === 0 && !hasFeedback && isFraud && "animate-slide-in-right",
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          isFraud && !hasFeedback ? "bg-red-500/15" : "bg-dark-700/50")}>
          <TypeIcon size={16} className={cn(isFraud && !hasFeedback ? "text-red-400" : "text-dark-400",
            tx.type === "withdrawal" && "rotate-180")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white font-mono tracking-tight">{formatCurrency(tx.amount)}</span>
            {hasFeedback ? (
              <Badge variant={tx.feedback === "confirmed_fraud" ? "critical" : "success"} dot={false}>
                {tx.feedback === "confirmed_fraud" ? "Fraude confirmee" : "Prédiction correcte"}
              </Badge>
            ) : <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-dark-400">{TYPE_LABELS[tx.type]}</span>
            <span className="text-dark-650">|</span>
            <ChannelIcon size={12} className="text-dark-500" />
            <span className="text-xs text-dark-500 capitalize">{tx.channel}</span>
            <span className="text-dark-650">|</span>
            <span className="text-xs text-dark-500">{tx.customer.city}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn("text-xs font-bold tabular-nums font-mono", scoreColor(tx.score))}>{formatScore(tx.score)}</span>
          <span className="text-[10px] text-dark-500 tabular-nums">{formatTimestamp(tx.timestamp)}</span>
        </div>
      </div>
    </button>
  )
}
