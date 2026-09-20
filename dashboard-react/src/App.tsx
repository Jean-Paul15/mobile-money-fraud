import { useMemo } from "react"
import { Database, Settings } from "lucide-react"
import Sidebar from "./components/layout/Sidebar"
import TopBar from "./components/layout/TopBar"
import SettingsTab from "./components/layout/SettingsTab"
import KPIRow from "./components/dashboard/KPIRow"
import ScoreChart from "./components/dashboard/ScoreChart"
import AlertTimeline from "./components/dashboard/AlertTimeline"
import DatabaseView from "./components/dashboard/DatabaseView"
import OperationalDigest from "./components/dashboard/OperationalDigest"
import LiveFeed from "./components/dashboard/LiveFeed"
import AlertBanner from "./components/dashboard/AlertBanner"
import { useFraudStream } from "./hooks/useFraudStream"
import { useState } from "react"
import { cn } from "./lib/utils"

export default function App() {
  const [activeTab, setActiveTab] = useState("surveillance")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  const {
    transactions,
    alerts,
    selectedTx,
    kpi,
    isRunning,
    speed,
    fraudRate,
    setSpeed,
    setFraudRate,
    toggleRunning,
    selectTransaction,
    markFalsePositive,
    markConfirmedFraud,
    resetAll,
    clearDatabase,
  } = useFraudStream()

  const alertCount = useMemo(
    () => alerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length,
    [alerts],
  )

  const criticalAlerts = useMemo(
    () => alerts.filter((a) => a.severity === "CRITICAL"),
    [alerts],
  )

  return (
    <div className="min-h-screen flex">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isRunning={isRunning}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        onToggleRunning={toggleRunning}
        speed={speed}
        onSpeedChange={setSpeed}
        fraudRate={fraudRate}
        onFraudRateChange={setFraudRate}
        kpi={kpi}
        alertCount={alertCount}
        onReset={resetAll}
        onClearDatabase={clearDatabase}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isRunning={isRunning}
          speed={speed}
          fraudRate={fraudRate}
          onReset={resetAll}
        />

        <div className="flex-1 overflow-y-auto">
          {/* ── Surveillance ─────────────────────────────────────────── */}
          {activeTab === "surveillance" && (
            <div className="p-5 md:p-6 space-y-4">
              {/* Critical alert banner */}
              <AlertBanner alerts={criticalAlerts} />

              {/* KPI strip */}
              <KPIRow kpi={kpi} isRunning={isRunning} />

              {/* Main grid: charts (left) + live feed (right) */}
              <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                {/* Charts column */}
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ScoreChart transactions={transactions} />
                    <AlertTimeline transactions={transactions} />
                  </div>
                  <OperationalDigest kpi={kpi} alerts={alerts} />
                </div>

                {/* Live feed */}
                <LiveFeed
                  transactions={transactions}
                  onSelect={selectTransaction}
                  selectedId={selectedTx?.id}
                />
              </div>
            </div>
          )}

          {/* ── Base d'audit ─────────────────────────────────────────── */}
          {activeTab === "database" && (
            <div className="p-5 md:p-6 space-y-4">
              {/* Section header — compact, no prose */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Database size={16} className="text-cyan-400 shrink-0" />
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">Journal complet</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {transactions.length.toLocaleString("fr-FR")} transactions ·{" "}
                      {alertCount} alertes prioritaires
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-1 rounded-md tabular-nums",
                    criticalAlerts.length > 0
                      ? "bg-red-500/15 text-red-400"
                      : "bg-slate-800 text-slate-500",
                  )}>
                    {criticalAlerts.length} critique{criticalAlerts.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <DatabaseView
                transactions={transactions}
                selectedTransaction={selectedTx}
                onSelectTransaction={selectTransaction}
                onConfirmFraud={markConfirmedFraud}
                onMarkFalsePositive={markFalsePositive}
              />
            </div>
          )}

          {/* ── Paramètres ───────────────────────────────────────────── */}
          {activeTab === "settings" && (
            <div className="p-5 md:p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Settings size={16} className="text-slate-400 shrink-0" />
                <h2 className="text-base font-bold text-white">Paramètres</h2>
              </div>
              <SettingsTab />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
