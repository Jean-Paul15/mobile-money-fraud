/**
 * GENERATEUR DE TRANSACTIONS — Distribution alignee sur les donnees d'entrainement
 * (src/data/generator.py : 500k transactions, 8 pays UEMOA, 0.15% fraude).
 *
 * CHANGEMENT CLE : Le generateur ne calcule PLUS de score heuristique.
 * Le score et les risk_factors sont fournis par le modele RandomForest
 * via l'API (predict_proba + SHAP TreeExplainer).
 *
 * Distribution :
 * - Operateurs : Orange (50%), MTN (35%), Moov (15%)
 * - Types      : transfer (35%), payment (28%), recharge (20%), withdrawal (10%), bill_pay (7%)
 * - Canaux     : mobile_app (40%), ussd (30%), agent (20%), web (10%)
 * - Montants   : log-normale, mu=8.5 sigma=1.8 (median ~5k, max ~3M)
 * - Fraude     : taux configurable (demo: 10%, reel: 0.15%)
 *   Types de fraude imitant l'entrainement :
 *     account_takeover (35%) : 100k-2M FCFA, mobile_app
 *     stolen_card (25%)      : 2k-50k FCFA, payment
 *     mule_network (20%)     : 50k-500k FCFA, transfer
 *     synthetic_id (13%)     : 150k-1M FCFA, operateur aleatoire
 *     smishing (7%)          : 5k-80k FCFA, ussd, recharge
 */
import type { Transaction, CustomerInfo, TransactionType, TransactionChannel, BehavioralFeatures } from "../types"

const FIRST_NAMES = [
  "Amadou", "Fatou", "Moussa", "Aminata", "Ibrahim", "Mariam", "Ousmane", "Kadiatou",
  "Sekou", "Bintou", "Modibo", "Awa", "Boubacar", "Rokia", "Lassana", "Djeneba",
  "Cheick", "Nafissatou", "Souleymane", "Adama", "Yacouba", "Fanta", "Mamadou", "Assetou",
]
const LAST_NAMES = [
  "Diallo", "Traore", "Coulibaly", "Keita", "Konate", "Toure", "Cisse", "Sangare",
  "Doumbia", "Maiga", "Sidibe", "Bagayoko", "Diarra", "Kone", "Samake", "Sissoko",
  "Camara", "Sow", "Bah", "Barry", "Sylla", "Diakite", "Fofana", "Haida",
]
const CITIES = [
  "Dakar", "Abidjan", "Bamako", "Ouagadougou", "Lome", "Cotonou", "Niamey",
  "Bissau", "Kayes", "Sikasso", "Segou", "Mopti", "Gao", "Bouake", "Korhogo",
  "Bobo-Dioulasso", "Thies", "Kaolack", "Kara", "Parakou", "Maradi",
]
const CITY_WEIGHTS = [
  0.18, 0.17, 0.10, 0.09, 0.09, 0.09, 0.06, 0.05,
  0.02, 0.02, 0.02, 0.02, 0.01, 0.02, 0.01,
  0.02, 0.01, 0.01, 0.00, 0.00, 0.01,
]

// ── Distributions calquees sur generator.py ──────────────────────────────
const OPERATORS: string[] = ["Orange", "MTN", "Moov"]
const OP_WEIGHTS = [0.50, 0.35, 0.15]

const TX_TYPES: TransactionType[] = ["transfer", "payment", "recharge", "withdrawal", "bill_pay"]
const TX_WEIGHTS = [0.35, 0.28, 0.20, 0.10, 0.07]

const CHANNELS: TransactionChannel[] = ["mobile_app", "ussd", "agent", "web"]
const CH_WEIGHTS = [0.40, 0.30, 0.20, 0.10]

// Types de fraude (proportions du generateur Python)
const FRAUD_TYPES = ["account_takeover", "stolen_card", "mule_network", "synthetic_id", "smishing"]
const FRAUD_WEIGHTS = [0.35, 0.25, 0.20, 0.13, 0.07]

export function genId(): string {
  const chars = "0123456789abcdef"
  let id = ""
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function weightedPick<T>(items: T[], weights: number[]): T {
  const r = Math.random()
  let cum = 0
  for (let i = 0; i < items.length; i++) {
    cum += weights[i]
    if (r <= cum) return items[i]
  }
  return items[items.length - 1]
}

function genPhone(): string {
  const prefixes = ["70", "74", "75", "76", "77", "78", "79", "90", "91", "93", "94", "95", "96", "60", "66"]
  let number = pick(prefixes)
  for (let i = 0; i < 8; i++) number += Math.floor(Math.random() * 10).toString()
  return number
}

/** Log-normale : exp(N(mu, sigma)) — identique a np.exp(np.random.normal(8.5, 1.8, n)) */
function logNormal(mu: number, sigma: number): number {
  // Box-Muller transform
  const u1 = Math.random() || 1e-10
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.exp(mu + sigma * z)
}

/**
 * Genere une transaction au format identique aux donnees d'entrainement.
 * AUCUN score heuristique — le score sera fourni par l'API (modele RF).
 */
export function generateTransaction(fraudRate: number): Transaction {
  const id = genId()
  const isFraud = Math.random() < fraudRate

  // ── Caracteristiques de base (distributions identiques a generator.py) ──
  const type = weightedPick(TX_TYPES, TX_WEIGHTS)
  const channel = weightedPick(CHANNELS, CH_WEIGHTS)
  const operator = weightedPick(OPERATORS, OP_WEIGHTS)
  const city = weightedPick(CITIES, CITY_WEIGHTS)
  const accountAge = Math.floor(Math.random() * 730) + 1

  // Montant log-normal (distribution d'entrainement)
  let amount = Math.round(logNormal(8.5, 1.8))
  amount = Math.max(50, Math.min(3_000_000, amount))

  // ── Injection de fraude (patterns identiques a generator.py) ──
  let fraudModifiers: Record<string, unknown> = {}
  if (isFraud) {
    const fraudType = weightedPick(FRAUD_TYPES, FRAUD_WEIGHTS)
    fraudModifiers = { fraud_type: fraudType }

    switch (fraudType) {
      case "account_takeover":
        // 100k-2M, force mobile_app
        amount = Math.floor(Math.random() * 1_900_000) + 100_000
        fraudModifiers = { ...fraudModifiers, channel: "mobile_app" }
        break
      case "stolen_card":
        // 2k-50k, force payment
        amount = Math.floor(Math.random() * 48_000) + 2_000
        fraudModifiers = { ...fraudModifiers, type: "payment" }
        break
      case "mule_network":
        // 50k-500k, force transfer
        amount = Math.floor(Math.random() * 450_000) + 50_000
        fraudModifiers = { ...fraudModifiers, type: "transfer" }
        break
      case "synthetic_id":
        // 150k-1M, operateur aleatoire
        amount = Math.floor(Math.random() * 850_000) + 150_000
        fraudModifiers = { ...fraudModifiers, operator: pick(OPERATORS) }
        break
      case "smishing":
        // 5k-80k, force ussd + recharge
        amount = Math.floor(Math.random() * 75_000) + 5_000
        fraudModifiers = { ...fraudModifiers, channel: "ussd", type: "recharge" }
        break
    }
  }

  const finalType = (fraudModifiers.type as TransactionType) ?? type
  const finalChannel = (fraudModifiers.channel as TransactionChannel) ?? channel
  const finalOperator = (fraudModifiers.operator as string) ?? operator

  // ── Caracteristiques comportementales (pour l'API RF) ─────────────────
  // DECOUVERTE CLE (debug_features.py) :
  // Le modele detecte la fraude via amount_vs_avg (ecart au profil habituel)
  // et amount_log (montant eleve). Les comptes fraudes sont des comptes
  // NORMAUX (KYC 68%, SIM swap 6%, age 232j) qui font UNE transaction
  // disproportionnee. Les features comme KYC, SIM swap, tx_count_24h
  // ne sont PAS discriminantes dans les donnees d'entrainement.
  //
  // Distributions reelles (test set) :
  //   amount_vs_avg : legit median=0.32, fraud median=13.9, P90=125.7
  //   sender_activity_weight : ~0 pour les deux (distribution exponentielle)
  //   tx_count_24h / amount_sum_24h : ~0 (rolling 24h, peu de transactions)
  let behavioral: BehavioralFeatures

  if (isFraud) {
    // Fraud: compte NORMAL (KYC OK, pas de SIM swap) avec transaction ANORMALE
    // amount_vs_avg cible: P50=14, P10=1, P90=125 (reproduit la distribution reelle)
    const avgTarget = Math.exp(Math.random() * 3.5) * 1.5  // log-normale, median ~10, max ~400
    behavioral = {
      tx_count_24h: Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 3) + 1,
      amount_sum_24h: 0,
      amount_vs_avg: avgTarget,
      sender_activity_weight: Math.random() * 0.001,  // ~0 comme les donnees reelles
      sender_sim_swap_recent: Math.random() < 0.06,    // 6% comme training
      sender_is_kyc_verified: Math.random() < 0.68,     // 68% comme training
    }
  } else {
    // Legitime: amount_vs_avg autour de 1, compte normal
    behavioral = {
      tx_count_24h: Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 3) + 1,
      amount_sum_24h: 0,
      amount_vs_avg: Math.exp(Math.random() * 1.5 - 0.5),  // median ~0.6, max ~4
      sender_activity_weight: Math.random() * 0.001,
      sender_sim_swap_recent: Math.random() < 0.04,         // 4% comme training
      sender_is_kyc_verified: Math.random() < 0.65,          // 65% comme training
    }
  }

  const customer: CustomerInfo = {
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    phone: genPhone(),
    city,
    operator: finalOperator,
    account_age_days: accountAge,
  }

  // Score = 0 : sera rempli par le modele RF via l'API
  // risk_factors = [] : seront fournis par SHAP
  return {
    id,
    amount,
    type: finalType,
    channel: finalChannel,
    score: 0,
    status: "pending",
    timestamp: new Date(),
    customer,
    risk_factors: [],
    feedback: "pending",
    behavioral,
  }
}
