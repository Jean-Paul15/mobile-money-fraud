import { Phone, Calendar, Ban, Eye, FileText, ShieldAlert, User } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { cn } from "../../lib/utils"

interface InvestigationProcedureProps { isBlocked: boolean; isFraud: boolean; score: number }

export default function InvestigationProcedure({ isBlocked, isFraud, score }: InvestigationProcedureProps) {
  // Action nuancee selon le niveau de risque
  const action = score >= 0.70
    ? "Bloquer la transaction et geler temporairement le compte"
    : isBlocked
      ? "Suspendre la transaction pour enquete approfondie"
      : "Surveiller le compte"

  const ActionIcon = score >= 0.70 ? ShieldAlert : isBlocked ? Ban : Eye

  const steps = [
    ...(isFraud ? [{ label: "Verifier le profil du client et son historique KYC", icon: User, urgent: false }] : []),
    { label: "Contacter le client par telephone", icon: Phone, urgent: false },
    { label: "Verifier l'historique recent des transactions", icon: Calendar, urgent: false },
    { label: action, icon: ActionIcon, urgent: score >= 0.70 },
    { label: "Documenter l'incident dans le journal d'audit", icon: FileText, urgent: false },
  ]

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <CardTitle className="uppercase tracking-[0.22em] text-slate-300">Procédure d’investigation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={i} className={cn("flex items-center gap-3 p-3 rounded-2xl border transition-all",
              step.urgent ? "bg-rose-500/10 border-rose-400/20" : "bg-white/4 border-white/6")}>
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                step.urgent ? "bg-rose-500/20" : "bg-slate-800/80")}>
                <Icon size={14} className={step.urgent ? "text-rose-300" : "text-slate-400"} />
              </div>
              <span className={cn("text-sm leading-6", step.urgent ? "text-rose-200 font-semibold" : "text-slate-300")}>
                {step.label}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
