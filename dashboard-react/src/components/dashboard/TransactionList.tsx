import { Smartphone } from "lucide-react"
import { Card } from "../ui/card"
import TransactionItem from "./TransactionItem"
import type { Transaction } from "../../types"

interface TransactionListProps {
  transactions: Transaction[]
  selectedTx: Transaction | null
  onSelect: (tx: Transaction) => void
}

export default function TransactionList({ transactions, selectedTx, onSelect }: TransactionListProps) {
  return (
    <Card padding="none" className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-white/8">
        <div>
          <h3 className="text-sm font-semibold tracking-[0.22em] uppercase text-white">Flux temps réel</h3>
          <p className="mt-1 text-xs text-slate-400">Séquence des transactions les plus récentes</p>
        </div>
        <span className="text-[11px] text-cyan-300 font-mono tabular-nums px-2.5 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/10">
          {transactions.length} événements
        </span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: "500px" }}>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Smartphone size={34} className="mb-3 opacity-40" />
            <p className="text-sm font-medium text-slate-300">Aucune transaction</p>
            <p className="text-xs mt-1 text-slate-500 text-center max-w-sm">
              Démarrez la simulation pour visualiser le flux et les comportements de risque.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/6">
            {transactions.map((tx, i) => (
              <TransactionItem key={tx.id} tx={tx} isSelected={selectedTx?.id === tx.id}
                onSelect={onSelect} index={i} />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
