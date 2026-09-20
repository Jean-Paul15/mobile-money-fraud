import { Eye } from "lucide-react"
import { Card, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Gauge } from "../ui/gauge"
import ClientInfoCard from "./ClientInfoCard"
import TransactionDetailCard from "./TransactionDetailCard"
import RiskFactorsList from "./RiskFactorsList"
import InvestigationProcedure from "./InvestigationProcedure"
import FeedbackButtons from "../feedback/FeedbackButtons"
import FeedbackStatus from "../feedback/FeedbackStatus"
import { formatScore } from "../../lib/utils"
import type { Transaction } from "../../types"

interface InvestigationSheetProps {
  transaction: Transaction | null
  onConfirmFraud?: (txId: string) => void
  onMarkFalsePositive?: (txId: string) => void
}

export default function InvestigationSheet({ transaction, onConfirmFraud, onMarkFalsePositive }: InvestigationSheetProps) {
  if (!transaction) {
    return (
      <Card variant="elevated" className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-500">
        <Eye size={40} className="mb-3 opacity-40" />
        <p className="text-sm font-medium text-slate-300">Sélectionnez une transaction</p>
        <p className="text-xs mt-1 text-slate-500 text-center max-w-[240px]">
          pour afficher la fiche d’investigation, le score de risque et les actions de contrôle.
        </p>
      </Card>
    )
  }
  const { id, customer, score, risk_factors, feedback } = transaction
  const isBlocked = score >= 0.50; const isFraud = score >= 0.30
  const hasFeedback = feedback !== undefined && feedback !== "pending"

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400 font-semibold">Fiche d’investigation</div>
            <div className="mt-2 text-sm font-semibold text-white truncate">Transaction {id.slice(-8)}</div>
            <div className="mt-1 text-xs text-slate-400">{customer.name} · {customer.operator} · {customer.city}</div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {hasFeedback ? (
              <Badge variant={feedback === "confirmed_fraud" ? "critical" : "success"} pulse={feedback === "confirmed_fraud"}>
                {feedback === "confirmed_fraud" ? "Fraude confirmée" : "Prédiction correcte"}
              </Badge>
            ) : (
              <Badge variant={isBlocked ? "critical" : isFraud ? "medium" : "success"} pulse={isBlocked}>
                {isBlocked ? "BLOQUÉE" : isFraud ? "SUSPECTE" : "LÉGITIME"}
              </Badge>
            )}
            <span className="text-xs font-mono text-slate-400">{formatScore(score)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ClientInfoCard customer={customer} />
        <TransactionDetailCard transaction={transaction} />
      </div>
      <Card variant="elevated" padding="md" className="flex flex-col items-center">
        <CardTitle className="mb-2 uppercase tracking-[0.22em] text-slate-300">Score de risque</CardTitle>
        <Gauge value={score} size={132} />
      </Card>
      <RiskFactorsList factors={risk_factors} />
      <InvestigationProcedure isBlocked={isBlocked} isFraud={isFraud} score={score} />
      {hasFeedback && <FeedbackStatus feedback={feedback!} />}
      <FeedbackButtons txId={id} onConfirmFraud={onConfirmFraud ?? (() => {})} onMarkFalsePositive={onMarkFalsePositive ?? (() => {})} />
    </div>
  )
}
