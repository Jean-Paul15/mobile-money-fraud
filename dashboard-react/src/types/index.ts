export type TransactionType = "transfer" | "payment" | "withdrawal" | "recharge" | "bill_pay"
export type TransactionChannel = "mobile_app" | "agent" | "ussd" | "web"
export type TransactionStatus = "accepted" | "blocked" | "pending"
export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
export type FeedbackAction = "confirmed_fraud" | "false_positive" | "pending"

export interface CustomerInfo {
  name: string
  phone: string
  city: string
  operator: string
  account_age_days: number
}

/** Caracteristiques comportementales pour l'API de scoring.
 *  Generees par le generateur selon les patterns de fraude,
 *  transmises a l'API pour que le RF puisse detecter la fraude. */
export interface BehavioralFeatures {
  tx_count_24h: number         // Nombre de transactions en 24h
  amount_sum_24h: number       // Somme des montants en 24h
  amount_vs_avg: number        // Ratio montant / moyenne habituelle
  sender_activity_weight: number // Poids d'activite du compte
  sender_sim_swap_recent: boolean
  sender_is_kyc_verified: boolean
}

export interface RiskFactor {
  name: string
  weight: number
  description: string
}

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  channel: TransactionChannel
  score: number
  status: TransactionStatus
  timestamp: Date
  customer: CustomerInfo
  risk_factors: RiskFactor[]
  feedback?: FeedbackAction
  behavioral?: BehavioralFeatures
}

export interface FraudAlert {
  id: string
  transaction_id: string
  severity: AlertSeverity
  title: string
  message: string
  timestamp: Date
}

export interface KPIData {
  totalScanned: number
  fraudDetected: number
  fraudBlocked: number
  detectionRate: number
  avgScore: number
  avgSpeedMs: number
}

export interface BlockedTransaction {
  id: string
  amount: number
  type: TransactionType
  channel: TransactionChannel
  score: number
  status: TransactionStatus
  timestamp: string
  customer_name: string
  customer_phone: string
  customer_city: string
  operator: string
  risk_factors: string[]
  blocked_reason: string
  reviewed: boolean
  feedback?: FeedbackAction
}

export interface PaginatedResponse {
  items: BlockedTransaction[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ScoreResponse {
  transaction_id: string
  score: number
  status: "accepted" | "blocked"
  risk_factors: RiskFactor[]
  processing_time_ms: number
}
