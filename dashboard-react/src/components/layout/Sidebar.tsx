import { useState } from "react"
import { Shield, Play, Square, Gauge, Menu, X, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import SidebarNav from "./SidebarNav"
import SidebarKPIs from "./SidebarKPIs"
import SidebarControls from "./SidebarControls"
import type { KPIData } from "../../types"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isRunning: boolean
  onToggleRunning: () => void
  speed: number
  onSpeedChange: (speed: number) => void
  fraudRate: number
  onFraudRateChange: (rate: number) => void
  kpi: KPIData
  alertCount: number
  onReset: () => void
  onClearDatabase: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

export default function Sidebar({
  activeTab,
  onTabChange,
  isRunning,
  onToggleRunning,
  speed,
  onSpeedChange,
  fraudRate,
  onFraudRateChange,
  kpi,
  alertCount,
  onReset,
  onClearDatabase,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950/90 border border-slate-700/70 text-slate-200 hover:text-white transition-colors backdrop-blur-xl shadow-xl"
        aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out",
          "glass-panel border-r border-white/8 bg-slate-950/90 backdrop-blur-2xl shadow-[18px_0_45px_rgba(0,0,0,0.28)]",
          "lg:sticky lg:top-0 lg:left-auto lg:z-20 lg:h-screen lg:shrink-0",
          mobileOpen ? "translate-x-0 w-[280px] lg:translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[88px]" : "lg:w-[280px]",
          "w-[280px]",
        )}
      >
        <div className={cn(
          "flex items-center border-b border-white/6",
          collapsed ? "justify-center px-3 py-4 lg:px-2" : "gap-3 px-4 py-4",
        )}>
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-sky-500 to-cyan-300 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20">
            <Shield size={20} className="text-slate-950" />
          </div>
          <div className={cn("min-w-0", collapsed && "hidden lg:hidden")}>
            <h1 className="text-[15px] font-bold text-white leading-tight">PayLink Africa</h1>
            <span className="text-[10px] text-cyan-300 font-semibold tracking-[0.28em] uppercase">Fraud Command Center</span>
          </div>
          <button
            onClick={onToggleCollapsed}
            className="ml-auto hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/8 bg-white/5 text-slate-300 hover:text-white hover:bg-white/8 transition-colors"
            aria-label={collapsed ? "Déplier la barre latérale" : "Réduire la barre latérale"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <div className="px-3 pt-3">
          <div className={cn(
            "rounded-xl border border-white/6 bg-white/4 p-2",
            collapsed && "bg-transparent border-0 p-0",
          )}>
            <SidebarNav activeTab={activeTab} onTabChange={onTabChange} alertCount={alertCount} collapsed={collapsed} />
          </div>
        </div>
        {!collapsed && (
          <>
            <Separator variant="subtle" className="mx-4 mt-3 w-auto opacity-35" />
            <SidebarKPIs kpi={kpi} />
            <Separator variant="subtle" className="mx-4 w-auto opacity-35" />
            <SidebarControls speed={speed} onSpeedChange={onSpeedChange} fraudRate={fraudRate} onFraudRateChange={onFraudRateChange} />
          </>
        )}
        <div className={cn("mt-auto border-t border-white/6 space-y-2", collapsed ? "px-3 py-4" : "px-4 py-4")}>
          <Button
            variant={isRunning ? "destructive" : "success"}
            size={collapsed ? "sm" : "md"}
            className={cn("w-full", collapsed && "mx-auto h-12 w-12 justify-center px-0")}
            onClick={onToggleRunning}
            leftIcon={isRunning ? <Square size={15} className="animate-blink-dot" /> : <Play size={15} />}
            rightIcon={!collapsed && isRunning ? <Gauge size={15} className="animate-spin-slow" /> : undefined}
            aria-label={isRunning ? "Arrêter la simulation" : "Démarrer la simulation"}
          >
            <span className={cn(collapsed && "hidden")}>{isRunning ? "ARRETER" : "DEMARRER"}</span>
          </Button>
          <Button
            variant="outline"
            size={collapsed ? "sm" : "sm"}
            className={cn("w-full", collapsed && "mx-auto h-10 w-10 justify-center px-0")}
            onClick={onClearDatabase}
            leftIcon={<Trash2 size={14} />}
            aria-label="Vider la base de données"
          >
            <span className={cn(collapsed && "hidden")}>Vider base</span>
          </Button>
          {!collapsed && (
            <Button variant="ghost" size="sm" className="w-full" onClick={onReset}>
              Reinitialiser
            </Button>
          )}
        </div>
      </aside>
    </>
  )
}
