import { ShieldCheck, AlertTriangle, FileClock, Activity, Database } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { Badge } from "../ui/badge"
import { formatDateTime, formatScore, truncateId, getSeverityVariant } from "../../lib/utils"
import type { FraudAlert, KPIData } from "../../types"

interface OperationalDigestProps {
  kpi: KPIData
  alerts: FraudAlert[]
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-slate-400 text-[11px] uppercase tracking-[0.22em] font-semibold">
        <Icon size={12} className="text-cyan-300" />
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white tabular-nums">{value}</div>
    </div>
  )
}

export default function OperationalDigest({ kpi, alerts }: OperationalDigestProps) {
  const topAlert = alerts[0] ?? null
  const reviewQueue = alerts.filter((alert) => alert.severity === "MEDIUM").length

  return (
    <Card variant="elevated" padding="lg" className="h-full">
      <CardHeader className="items-start gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-[13px] uppercase tracking-[0.28em] text-slate-300">Synthèse opérationnelle</CardTitle>
            <Badge variant="success" dot pulse={false}>En ligne</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Vue consolidée des alertes, du flux et de la traçabilité pour un contrôle bancaire lisible.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricPill icon={Activity} label="Transactions" value={kpi.totalScanned.toLocaleString("fr-FR")} />
          <MetricPill icon={ShieldCheck} label="Bloquées" value={kpi.fraudBlocked.toLocaleString("fr-FR")} />
          <MetricPill icon={AlertTriangle} label="Alertes critiques" value={alerts.filter((alert) => alert.severity === "CRITICAL").length.toString()} />
          <MetricPill icon={Database} label="File d’examen" value={reviewQueue.toString()} />
        </div>

        <div className="rounded-xl border border-white/8 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400 font-semibold">Dernière alerte</div>
              {topAlert ? (
                <>
                  <div className="mt-2 text-sm font-semibold text-white">{topAlert.title}</div>
                  <p className="mt-1 text-sm text-slate-400 leading-6">{topAlert.message}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-400">Aucune alerte générée pour le moment.</p>
              )}
            </div>
            {topAlert && (
              <Badge variant={getSeverityVariant(topAlert.severity)} pulse={topAlert.severity === "CRITICAL"}>
                {topAlert.severity}
              </Badge>
            )}
          </div>
          {topAlert && (
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
              <FileClock size={13} />
              <span>{formatDateTime(topAlert.timestamp.toISOString())}</span>
              <span className="text-slate-600">|</span>
              <span className="font-mono">{truncateId(topAlert.transaction_id)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">Score moyen</div>
            <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">{formatScore(kpi.avgScore)}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">Détection</div>
            <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">{kpi.detectionRate.toFixed(1)}%</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">Latence</div>
            <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">{Math.round(kpi.avgSpeedMs)} ms</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
