import { CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "../ui/card"

interface FeedbackStatusProps { feedback: string }

export default function FeedbackStatus({ feedback }: FeedbackStatusProps) {
  const isFraud = feedback === "confirmed_fraud"
  return (
    <Card padding="md" className="bg-dark-800/40">
      <CardContent className="flex items-center gap-2 text-xs text-dark-400">
        <CheckCircle2 size={14} className={isFraud ? "text-red-400" : "text-emerald-400"} />
        <span>Decision enregistree: {isFraud ? "Fraude confirmee" : "Prédiction correcte"}</span>
      </CardContent>
    </Card>
  )
}
