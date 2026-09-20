import { Hash, ArrowRightLeft, CreditCard } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import InfoRow from "./InfoRow"
import { formatCurrency } from "../../lib/utils"
import { TYPE_LABELS, CHANNEL_LABELS } from "../../lib/constants"
import type { Transaction } from "../../types"
import { cn } from "../../lib/utils"

interface TransactionDetailCardProps { transaction: Transaction }

export default function TransactionDetailCard({ transaction }: TransactionDetailCardProps) {
  const { id, amount, type, channel, score } = transaction
  return (
    <Card variant="elevated" padding="lg" className="h-full">
      <CardHeader>
        <CardTitle className="uppercase tracking-[0.22em] text-slate-300">Détails transaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow icon={Hash} text={id} mono small />
        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-3 py-3">
          <ArrowRightLeft size={14} className="text-slate-400 shrink-0" />
          <span className={cn("font-bold font-mono text-lg", score >= 0.5 ? "text-rose-300" : "text-white")}>
            {formatCurrency(amount)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/5 px-3 py-1.5 text-slate-300">
            <CreditCard size={14} className="text-cyan-300 shrink-0" />
            {TYPE_LABELS[type]}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/5 px-3 py-1.5 text-slate-300">
            <span className="text-slate-500">Canal</span>
            {CHANNEL_LABELS[channel]}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
