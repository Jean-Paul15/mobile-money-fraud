import { Search, Filter, Download, RefreshCw, ChevronDown } from "lucide-react"
import { Button } from "../ui/button"

interface DatabaseToolbarProps {
  search: string; onSearchChange: (v: string) => void
  scoreFilter: number; onScoreFilterChange: (v: number) => void
  statusFilter: string; onStatusFilterChange: (v: string) => void
  onExport: () => void; onRefresh: () => void
  loading: boolean; hasData: boolean
}

export default function DatabaseToolbar({
  search, onSearchChange, scoreFilter, onScoreFilterChange, statusFilter, onStatusFilterChange, onExport, onRefresh, loading, hasData,
}: DatabaseToolbarProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(230px,0.8fr)_minmax(210px,0.7fr)_auto] xl:items-end">
      <div className="relative w-full">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Rechercher ID, client..." value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-white/8 bg-slate-900/70 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-400/50 focus:bg-slate-900/90" />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">
          <Filter size={13} className="text-cyan-300 shrink-0" />
          Score minimum
        </div>
        <div className="relative">
          <select value={scoreFilter} onChange={(e) => onScoreFilterChange(Number(e.target.value))}
            className="w-full appearance-none rounded-lg border border-white/8 bg-slate-900/70 px-3 py-2.5 pr-10 text-sm text-white transition-colors focus:outline-none focus:border-cyan-400/50 focus:bg-slate-900/90">
          <option value={0}>Tous les scores</option>
          <option value={70}>Score superieur ou egal a 70</option>
          <option value={80}>Score superieur ou egal a 80</option>
          <option value={90}>Score superieur ou egal a 90</option>
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-semibold">Statut</div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}
            className="w-full appearance-none rounded-lg border border-white/8 bg-slate-900/70 px-3 py-2.5 pr-10 text-sm text-white transition-colors focus:outline-none focus:border-cyan-400/50 focus:bg-slate-900/90">
          <option value="all">Tous les statuts</option>
          <option value="accepted">Acceptées</option>
          <option value="blocked">Bloquées</option>
          <option value="pending">En attente</option>
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      </div>
      <div className="flex items-center gap-2 xl:justify-end xl:self-end">
        <Button variant="outline" size="sm" onClick={onExport} leftIcon={<Download size={14} />} disabled={!hasData}>
          Exporter CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onRefresh} leftIcon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}>
          Actualiser
        </Button>
      </div>
    </div>
  )
}
