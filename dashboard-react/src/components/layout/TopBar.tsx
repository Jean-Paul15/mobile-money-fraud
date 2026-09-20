import { Activity, Database, Settings } from "lucide-react"
import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import TabButton from "./TabButton"
import { cn } from "../../lib/utils"

interface TopBarProps {
  activeTab: string; onTabChange: (tab: string) => void
  isRunning: boolean; speed: number; fraudRate: number; onReset: () => void
}

export default function TopBar({ activeTab, onTabChange, isRunning, speed, fraudRate, onReset }: TopBarProps) {
  return (
    <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
      <div className="flex flex-col gap-3 px-4 md:px-6 py-3.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden xl:flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/80 font-semibold">Fraud Operations Center</span>
            <span className="text-sm font-semibold text-white">
              {isRunning ? "Surveillance active" : "Surveillance en pause"}
            </span>
          </div>
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/8 bg-white/5">
            <Activity size={15} className={cn("transition-colors duration-200", isRunning ? "text-emerald-300" : "text-slate-500")} />
            <span className="text-xs font-medium text-slate-200">
              {isRunning ? "Flux en temps réel" : "Flux interrompu"}
            </span>
            {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-300 animate-blink-dot" />}
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-1 bg-white/5 rounded-md p-1 border border-white/8">
          <TabButton active={activeTab === "surveillance"} onClick={() => onTabChange("surveillance")}
            icon={<Activity size={14} />} label="Surveillance" />
          <TabButton active={activeTab === "database"} onClick={() => onTabChange("database")}
            icon={<Database size={14} />} label="Centre d'audit" />
          <TabButton active={activeTab === "settings"} onClick={() => onTabChange("settings")}
            icon={<Settings size={14} />} label="Paramètres" />
        </div>
        <div className="flex items-center gap-2 xl:justify-end flex-wrap justify-start xl:justify-end">
          {activeTab === "surveillance" && (
            <>
              <span className="hidden xl:inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                Vitesse <span className="text-slate-100 font-mono tabular-nums">{speed}ms</span>
              </span>
              <span className="hidden xl:inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                Fraude <span className="text-slate-100 font-mono tabular-nums">{(fraudRate * 100).toFixed(0)}%</span>
              </span>
              <Separator orientation="vertical" className="h-5 hidden xl:block opacity-40" />
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>
        </div>
      </div>
    </div>
  )
}
