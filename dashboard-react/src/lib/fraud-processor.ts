import type { KPIData, FraudAlert, BlockedTransaction, Transaction } from "../types"
import { genId } from "./generators"

// ── Seuils de decision bases sur le modele RF ───────────────────────────
// Le modele donne une probabilite de fraude (predict_proba).
// Taux de fraude a l'entrainement : 0.15% (1 fraude pour 667 transactions).
//
//   score >= 0.50  → BLOQUE  (modele quasi-certain, 300x+ le taux de base)
//   score >= 0.30  → SUSPECT (alerte moyenne, necessite verification)
//   score >= 0.10  → FLAG    (attention, 66x le taux de base)
//   score <  0.10  → LEGITIME
//
const BLOCK_THRESHOLD = 0.50   // Blocage automatique
const ALERT_THRESHOLD = 0.30   // Alerte moyenne

export function updateKpis(prev: KPIData, tx: Transaction): KPIData {
  const totalScanned = prev.totalScanned + 1
  const fraudDetected = prev.fraudDetected + (tx.score >= ALERT_THRESHOLD ? 1 : 0)
  const fraudBlocked = prev.fraudBlocked + (tx.score >= BLOCK_THRESHOLD ? 1 : 0)
  return {
    totalScanned, fraudDetected, fraudBlocked,
    detectionRate: totalScanned > 0 ? (fraudDetected / totalScanned) * 100 : 0,
    avgScore: totalScanned > 0
      ? ((prev.avgScore * prev.totalScanned + tx.score) / totalScanned)
      : tx.score,
    avgSpeedMs: totalScanned > 0
      ? ((prev.avgSpeedMs * prev.totalScanned + (20 + Math.random() * 40)) / totalScanned)
      : 20 + Math.random() * 40,
  }
}

export function createAlerts(tx: Transaction): FraudAlert[] {
  const alerts: FraudAlert[] = []
  const topFactor = tx.risk_factors[0]?.name ?? "Anomalie detectee"

  if (tx.score >= BLOCK_THRESHOLD) {
    alerts.push({
      id: genId(), transaction_id: tx.id,
      severity: tx.score >= 0.70 ? "CRITICAL" : "HIGH",
      title: tx.score >= 0.70 ? "Alerte critique" : "Alerte haute",
      message: tx.score >= 0.70
        ? `Transaction ${tx.type} de ${tx.amount.toLocaleString("fr-FR")} FCFA bloquee (${topFactor})`
        : `Transaction ${tx.type} suspecte detectee — ${topFactor} (score ${Math.round(tx.score * 100)}%)`,
      timestamp: new Date(),
    })
  } else if (tx.score >= ALERT_THRESHOLD) {
    alerts.push({
      id: genId(), transaction_id: tx.id,
      severity: "MEDIUM", title: "Alerte moyenne",
      message: `Transaction ${tx.type} necessite verification — ${topFactor} (score ${Math.round(tx.score * 100)}%)`,
      timestamp: new Date(),
    })
  }
  return alerts
}

export function createBlockedTx(tx: Transaction): BlockedTransaction | null {
  if (tx.score < BLOCK_THRESHOLD) return null
  const topFactor = tx.risk_factors[0]
  return {
    id: tx.id, amount: tx.amount, type: tx.type, channel: tx.channel,
    score: tx.score, status: "blocked", timestamp: tx.timestamp.toISOString(),
    customer_name: tx.customer.name, customer_phone: tx.customer.phone,
    customer_city: tx.customer.city, operator: tx.customer.operator,
    risk_factors: tx.risk_factors.map((rf) => rf.name),
    blocked_reason: topFactor
      ? `${topFactor.name} (${Math.round(topFactor.weight * 100)}%)`
      : "Modele RF — score eleve",
    reviewed: false, feedback: "pending",
  }
}
