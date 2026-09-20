import { formatCurrency, formatScore } from "../../lib/utils"
import type { BlockedTransaction } from "../../types"
import { cn } from "../../lib/utils"

interface ExpandableDetailProps { tx: BlockedTransaction | undefined; onClose: () => void }

export default function ExpandableDetail({ tx, onClose }: ExpandableDetailProps) {
  if (!tx) return null
  const fbLabel = tx.feedback === "confirmed_fraud" ? "Fraude confirmee" : tx.feedback === "false_positive" ? "Prédiction correcte" : "En attente"
  const fbColor = tx.feedback === "confirmed_fraud" ? "text-red-400" : tx.feedback === "false_positive" ? "text-emerald-400" : "text-dark-400"

  return (
    <div className="px-4 py-4 bg-dark-800/50 border-t border-dark-700/50 animate-slide-up">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Client</h4>
          <p className="text-sm text-white">{tx.customer_name}</p>
          <p className="text-xs text-dark-400 mt-1">{tx.customer_phone}</p>
          <p className="text-xs text-dark-400">{tx.customer_city}</p>
          <p className="text-xs text-dark-500 mt-1">Operateur: {tx.operator}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Transaction</h4>
          <p className="text-sm text-white capitalize">{tx.type} - {tx.channel}</p>
          <p className="text-sm font-bold text-white font-mono mt-1">{formatCurrency(tx.amount)}</p>
          <p className="text-xs text-dark-400 mt-1">Score: {formatScore(tx.score)}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Raison du blocage</h4>
          <p className="text-sm text-red-300">{tx.blocked_reason}</p>
          {tx.risk_factors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tx.risk_factors.map((rf, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-dark-700 text-dark-300">{rf}</span>
              ))}
            </div>
          )}
          <div className="mt-2">
            <span className="text-xs text-dark-400">Feedback: </span>
            <span className={cn("text-xs font-semibold", fbColor)}>{fbLabel}</span>
          </div>
        </div>
      </div>
      <button onClick={onClose} className="mt-3 text-xs text-dark-400 hover:text-white transition-colors">
        Fermer les details
      </button>
    </div>
  )
}
