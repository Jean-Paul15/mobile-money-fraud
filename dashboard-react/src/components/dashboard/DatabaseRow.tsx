import { Badge } from "../ui/badge"
import { formatCurrency, formatDateTime, formatScore, truncateId, cn } from "../../lib/utils"
import type { Transaction } from "../../types"

interface DatabaseRowProps {
  tx: Transaction
  isSelected: boolean
  onSelect: (id: string) => void
}

function feedbackBadge(fb?: string) {
  if (fb === "confirmed_fraud") return <Badge variant="critical">Fraude confirmée</Badge>
  if (fb === "false_positive") return <Badge variant="success">Prédiction correcte</Badge>
  return <Badge variant="pending" dot={false}>En attente</Badge>
}

function statusBadge(status: Transaction["status"]) {
  if (status === "blocked") return <Badge variant="critical" dot={false}>Bloquée</Badge>
  if (status === "pending") return <Badge variant="pending" dot={false}>En attente</Badge>
  return <Badge variant="success" dot={false}>Acceptée</Badge>
}

export default function DatabaseRow({ tx, isSelected, onSelect }: DatabaseRowProps) {
  return (
    <tr
      onClick={() => onSelect(tx.id)}
      className={cn(
        "cursor-pointer transition-colors hover:bg-white/5",
        isSelected && "bg-cyan-400/8",
      )}
    >
      <td className="px-4 py-3 text-xs font-mono text-slate-400" title={tx.id}>{truncateId(tx.id)}</td>
      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDateTime(tx.timestamp.toISOString())}</td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-white">{tx.customer.name}</div>
        <div className="text-xs text-slate-500">{tx.customer.city}</div>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-white font-mono tabular-nums">{formatCurrency(tx.amount)}</td>
      <td className="px-4 py-3">
        <Badge variant={tx.score >= 0.70 ? "critical" : tx.score >= 0.50 ? "high" : tx.score >= 0.30 ? "medium" : "success"} dot={false}>
          {formatScore(tx.score)}
        </Badge>
      </td>
      <td className="px-4 py-3">{statusBadge(tx.status)}</td>
      <td className="px-4 py-3">{feedbackBadge(tx.feedback)}</td>
    </tr>
  )
}
