import { Ban, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "../ui/card"
import { Button } from "../ui/button"

interface FeedbackButtonsProps {
  txId: string
  onConfirmFraud: (txId: string) => void
  onMarkFalsePositive: (txId: string) => void
}

export default function FeedbackButtons({ txId, onConfirmFraud, onMarkFalsePositive }: FeedbackButtonsProps) {
  return (
    <Card padding="md">
      <CardContent className="space-y-2">
        <Button variant="destructive" size="md" className="w-full"
          leftIcon={<Ban size={16} />} onClick={() => onConfirmFraud(txId)}>
          Confirmer la fraude
        </Button>
        <Button variant="outline" size="md" className="w-full"
          leftIcon={<CheckCircle2 size={16} />} onClick={() => onMarkFalsePositive(txId)}>
          Prédiction correcte
        </Button>
      </CardContent>
    </Card>
  )
}
