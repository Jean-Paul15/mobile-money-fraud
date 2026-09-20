import type { Transaction, RiskFactor } from "../types"

// ── Constantes ──────────────────────────────────────────────────────────
const API_BASE = "/api"

// ── Mapping operateur dashboard → API (calque sur generator.py) ─────────
const OP_MAP: Record<string, string> = {
  "Orange": "Orange",
  "MTN": "MTN",
  "Moov": "Moov",
}

const TYPE_MAP: Record<string, string> = {
  "transfer": "transfer",
  "payment": "payment",
  "withdrawal": "withdrawal",
  "recharge": "recharge",
  "bill_pay": "bill_pay",
}

const CHANNEL_MAP: Record<string, string> = {
  "mobile_app": "mobile_app",
  "agent": "agent",
  "web": "web",
  "ussd": "ussd",
}


interface ApiScoreResponse {
  score: number
  decision: string
  model: string
  latency_ms: number
  risk_factors: RiskFactor[]
}


/**
 * Appelle l'API de scoring et REMPLACE le score/status/risk_factors
 * par les predictions RELLES du modele RandomForest.
 *
 * Architecture :
 * - Le generateur cree des transactions sans score (distributions d'entrainement)
 * - L'API appelle RF.predict_proba() → probabilite de fraude = SCORE
 * - L'API appelle SHAP TreeExplainer → facteurs de risque EXPLICATIFS
 * - Le frontend NE CALCULE RIEN — il affiche les decisions du modele
 *
 * Seuils de decision (base training data 0.15% fraude) :
 *   score >= 0.50  → BLOCKED  (200x+ le taux de base)
 *   score >= 0.15  → SUSPECT  (100x le taux de base, status "accepted" mais flag)
 *   score <  0.15  → ACCEPTED
 */
export async function scoreTransaction(tx: Transaction): Promise<Transaction> {
  try {
    const b = tx.behavioral
    const body = {
      transaction_id: tx.id,
      amount: tx.amount,
      transaction_type: TYPE_MAP[tx.type] ?? tx.type,
      channel: CHANNEL_MAP[tx.channel] ?? tx.channel,
      operator: OP_MAP[tx.customer.operator] ?? tx.customer.operator,
      timestamp: tx.timestamp.toISOString(),
      sender_account_age: tx.customer.account_age_days,
      // Caracteristiques comportementales (calquees sur training data)
      sender_is_kyc_verified: b?.sender_is_kyc_verified ? 1 : 0,
      sender_sim_swap_recent: b?.sender_sim_swap_recent ? 1 : 0,
      sender_activity_weight: b?.sender_activity_weight ?? 0,
      tx_count_24h: b?.tx_count_24h ?? 0,
      amount_sum_24h: b?.amount_sum_24h ?? 0,
      amount_vs_avg: b?.amount_vs_avg ?? 1.0,
    }

    const res = await fetch(`${API_BASE}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data: ApiScoreResponse = await res.json()

      // Le score du modele = probabilite de fraude predite
      const score = data.score
      const status: Transaction["status"] = score >= 0.50 ? "blocked" : "accepted"

      // Facteurs de risque = explications SHAP du modele
      let riskFactors = data.risk_factors ?? []

      // Filtrer "Transaction normale" si on a de vrais signaux
      const realFactors = riskFactors.filter((rf) => rf.name !== "Transaction normale")
      if (realFactors.length > 0) {
        riskFactors = realFactors
      }

      return {
        ...tx,
        score,
        status,
        risk_factors: riskFactors.slice(0, 5),
        feedback: status === "blocked" ? "pending" : "false_positive",
      }
    }
  } catch {
    // API indisponible → score a 0, status pending
    console.warn("API de scoring indisponible — transaction en attente")
  }

  return { ...tx, score: 0, status: "pending", risk_factors: [] }
}
