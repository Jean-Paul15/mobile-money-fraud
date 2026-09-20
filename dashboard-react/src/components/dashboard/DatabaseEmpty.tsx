import { RefreshCw, Database } from "lucide-react"

interface DatabaseEmptyProps { loading: boolean; hasData: boolean }

export default function DatabaseEmpty({ loading, hasData }: DatabaseEmptyProps) {
  if (loading && !hasData) {
    return (
      <div className="flex items-center justify-center h-60 text-dark-500">
        <RefreshCw size={24} className="animate-spin mr-2" /><span className="text-sm">Chargement...</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 text-dark-500">
      <Database size={32} className="mb-2 opacity-40" />
      <p className="text-sm font-medium">Aucune transaction disponible</p>
      <p className="text-xs mt-1">Les transactions stockées apparaissent ici</p>
    </div>
  )
}
