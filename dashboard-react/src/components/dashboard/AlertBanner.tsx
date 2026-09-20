import { AlertTriangle, X } from "lucide-react"
import { useState } from "react"
import type { FraudAlert } from "../../types"

interface AlertBannerProps {
  alerts: FraudAlert[]
}

export default function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || alerts.length === 0) return null

  const latest = alerts[0]

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-sm">
      <AlertTriangle size={14} className="text-red-400 shrink-0" />
      <span className="text-red-300 font-semibold shrink-0">
        {alerts.length} alerte{alerts.length > 1 ? "s" : ""} critique{alerts.length > 1 ? "s" : ""}
      </span>
      <span className="text-red-400/80 truncate">{latest.title}</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto shrink-0 text-red-400/60 hover:text-red-300 transition-colors"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  )
}
