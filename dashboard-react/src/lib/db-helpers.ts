import type { BlockedTransaction } from "../types"

export const PAGE_SIZE = 15
export const CSV_COLUMNS = [
  { key: "id", label: "ID" }, { key: "customer_name", label: "Client" }, { key: "customer_phone", label: "Telephone" },
  { key: "customer_city", label: "Ville" }, { key: "amount", label: "Montant" }, { key: "type", label: "Type" },
  { key: "channel", label: "Canal" }, { key: "score", label: "Score" }, { key: "blocked_reason", label: "Raison" },
  { key: "feedback", label: "Feedback" }, { key: "timestamp", label: "Date" },
]

export function filterLocal(txs: BlockedTransaction[], search: string, scoreFilter: number) {
  let filtered = [...txs]
  if (search) {
    const lower = search.toLowerCase()
    filtered = filtered.filter((tx) =>
      tx.id.toLowerCase().includes(lower) || tx.customer_name.toLowerCase().includes(lower) || tx.customer_phone.includes(search))
  }
  if (scoreFilter > 0) filtered = filtered.filter((tx) => tx.score >= scoreFilter / 100)
  return filtered
}
