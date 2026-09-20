import DatabaseRow from "./DatabaseRow"
import type { Transaction } from "../../types"

interface DatabaseTableProps {
  data: Transaction[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const HEADERS = ["ID", "Date", "Client", "Montant", "Score", "Statut", "Feedback"]

export default function DatabaseTable({ data, selectedId, onSelect }: DatabaseTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/8 bg-white/5">
            {HEADERS.map((h) => (
              <th key={h} className={`text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.22em] ${h === "Client" ? "min-w-[190px]" : ""} ${h === "Montant" ? "min-w-[110px]" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {data.map((tx) => (
            <DatabaseRow key={tx.id} tx={tx} isSelected={selectedId === tx.id} onSelect={onSelect} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
