import { useEffect, useMemo, useState } from "react"
import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import DatabaseToolbar from "./DatabaseToolbar"
import DatabaseTable from "./DatabaseTable"
import DatabasePagination from "./DatabasePagination"
import DatabaseEmpty from "./DatabaseEmpty"
import InvestigationSheet from "./InvestigationSheet"
import { exportCSV, formatScore } from "../../lib/utils"
import { PAGE_SIZE } from "../../lib/db-helpers"
import type { Transaction } from "../../types"

interface DatabaseViewProps {
  transactions: Transaction[]
  selectedTransaction: Transaction | null
  onSelectTransaction: (tx: Transaction) => void
  onConfirmFraud: (txId: string) => void
  onMarkFalsePositive: (txId: string) => void
  loading?: boolean
}

const tooltipStyle = {
  backgroundColor: "#131318",
  border: "1px solid #252532",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#e2e8f0",
}

function scoreBuckets(transactions: Transaction[]) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}-${(i + 1) * 10}`,
    count: 0,
    mid: (i * 10 + 5) / 100,
  }))
  transactions.forEach((tx) => {
    buckets[Math.min(9, Math.floor(tx.score * 10))].count += 1
  })
  return buckets
}

function statusStats(transactions: Transaction[]) {
  const counts = { accepted: 0, blocked: 0, pending: 0 }
  transactions.forEach((tx) => {
    counts[tx.status] += 1
  })
  return [
    { name: "Acceptées", value: counts.accepted, color: "#10b981" },
    { name: "Bloquées", value: counts.blocked, color: "#ef4444" },
    { name: "En attente", value: counts.pending, color: "#f59e0b" },
  ]
}

export default function DatabaseView({
  transactions,
  selectedTransaction,
  onSelectTransaction,
  onConfirmFraud,
  onMarkFalsePositive,
  loading = false,
}: DatabaseViewProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [scoreFilter, setScoreFilter] = useState(0)
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<string | null>(selectedTransaction?.id ?? null)

  useEffect(() => {
    if (selectedTransaction) {
      setSelectedId(selectedTransaction.id)
    } else if (!selectedId && transactions.length > 0) {
      setSelectedId(transactions[0].id)
    }
  }, [selectedTransaction, selectedId, transactions])

  const filtered = useMemo(() => {
    let items = [...transactions]
    if (search) {
      const lower = search.toLowerCase()
      items = items.filter((tx) =>
        tx.id.toLowerCase().includes(lower) ||
        tx.customer.name.toLowerCase().includes(lower) ||
        tx.customer.phone.includes(search) ||
        tx.customer.city.toLowerCase().includes(lower),
      )
    }
    if (scoreFilter > 0) {
      items = items.filter((tx) => tx.score >= scoreFilter / 100)
    }
    if (statusFilter !== "all") {
      items = items.filter((tx) => tx.status === statusFilter)
    }
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [transactions, search, scoreFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selected = useMemo(() => {
    const fromPage = pageData.find((tx) => tx.id === selectedId)
    if (fromPage) return fromPage
    const fromFilter = filtered.find((tx) => tx.id === selectedId)
    return fromFilter ?? pageData[0] ?? filtered[0] ?? selectedTransaction ?? null
  }, [filtered, pageData, selectedId, selectedTransaction])

  useEffect(() => {
    if (selected?.id) setSelectedId(selected.id)
  }, [selected?.id])

  const summary = useMemo(() => {
    const blocked = transactions.filter((tx) => tx.status === "blocked").length
    const pending = transactions.filter((tx) => tx.status === "pending").length
    const avgScore = transactions.length > 0 ? transactions.reduce((acc, tx) => acc + tx.score, 0) / transactions.length : 0
    return { blocked, pending, avgScore }
  }, [transactions])

  const scoreData = useMemo(() => scoreBuckets(transactions), [transactions])
  const statusData = useMemo(() => statusStats(transactions), [transactions])
  const handleExport = () => {
    const rows = filtered.map((tx) => ({
      id: tx.id,
      client: tx.customer.name,
      telephone: tx.customer.phone,
      ville: tx.customer.city,
      montant: tx.amount,
      type: tx.type,
      canal: tx.channel,
      score: formatScore(tx.score),
      statut: tx.status,
      feedback: tx.feedback ?? "pending",
      date: tx.timestamp.toISOString(),
    }))
    exportCSV(rows, [
      { key: "id", label: "ID" },
      { key: "client", label: "Client" },
      { key: "telephone", label: "Téléphone" },
      { key: "ville", label: "Ville" },
      { key: "montant", label: "Montant" },
      { key: "type", label: "Type" },
      { key: "canal", label: "Canal" },
      { key: "score", label: "Score" },
      { key: "statut", label: "Statut" },
      { key: "feedback", label: "Feedback" },
      { key: "date", label: "Date" },
    ], "journal_transactions.csv")
  }

  const handleRefresh = () => {
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <DatabaseToolbar
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(1) }}
        scoreFilter={scoreFilter}
        onScoreFilterChange={(value) => { setScoreFilter(value); setPage(1) }}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => { setStatusFilter(value); setPage(1) }}
        onExport={handleExport}
        onRefresh={handleRefresh}
        loading={loading}
        hasData={transactions.length > 0}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Transactions" value={transactions.length.toLocaleString("fr-FR")} tone="cyan" />
        <MetricCard title="Bloquées" value={summary.blocked.toLocaleString("fr-FR")} tone="danger" />
        <MetricCard title="En attente" value={summary.pending.toLocaleString("fr-FR")} tone="warning" />
        <MetricCard title="Score moyen" value={summary.avgScore > 0 ? formatScore(summary.avgScore) : "0%"} tone="muted" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card variant="elevated" padding="lg">
          <CardHeader className="items-start gap-2">
            <div>
              <CardTitle className="uppercase tracking-[0.22em] text-slate-300">Répartition des scores</CardTitle>
              <p className="mt-1 text-sm text-slate-400">Lecture de la concentration du risque sur l’ensemble du journal.</p>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scoreData} margin={{ top: 10, right: 8, bottom: 0, left: -14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e28" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: "#6b6b80", fontSize: 11 }} axisLine={{ stroke: "#252532" }} tickLine={false} />
                <YAxis tick={{ fill: "#6b6b80", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} transaction(s)`, "Volume"]} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {scoreData.map((entry) => (
                    <Cell
                      key={entry.bucket}
                      fill={entry.mid >= 0.7 ? "#ef4444" : entry.mid >= 0.5 ? "#f59e0b" : "#10b981"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader className="items-start gap-2">
            <div>
              <CardTitle className="uppercase tracking-[0.22em] text-slate-300">Statut du journal</CardTitle>
              <p className="mt-1 text-sm text-slate-400">Répartition des transactions selon leur statut opérationnel.</p>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={4}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.85fr)] items-start">
        <Card padding="none" className="overflow-hidden">
          {pageData.length === 0 ? (
            <DatabaseEmpty loading={loading} hasData={transactions.length > 0} />
          ) : (
            <>
              <DatabaseTable data={pageData} selectedId={selected?.id ?? null} onSelect={(id) => {
                const picked = filtered.find((tx) => tx.id === id) ?? null
                if (picked) onSelectTransaction(picked)
                setSelectedId(id)
              }} />
              <DatabasePagination page={page} totalPages={totalPages} totalItems={filtered.length} onPageChange={setPage} />
            </>
          )}
        </Card>

        <div className="space-y-5 sticky top-24">
          <InvestigationSheet
            transaction={selected ?? null}
            onConfirmFraud={onConfirmFraud}
            onMarkFalsePositive={onMarkFalsePositive}
          />
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string
  value: string
  tone: "cyan" | "success" | "danger" | "warning" | "muted"
}) {
  const toneClasses: Record<"cyan" | "success" | "danger" | "warning" | "muted", string> = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    danger: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    warning: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    muted: "border-white/8 bg-white/5 text-slate-200",
  }
  return (
    <Card variant="glass" padding="md" className={toneClasses[tone]}>
      <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-slate-400">{title}</div>
      <div className="mt-2 text-xl font-black text-white font-mono tabular-nums">{value}</div>
    </Card>
  )
}
