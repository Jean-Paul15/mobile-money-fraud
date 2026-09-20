import { Activity, Database, Settings } from "lucide-react"
import { cn } from "../../lib/utils"

interface SidebarNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
  alertCount: number
  collapsed?: boolean
}

const navItems = [
  { id: "surveillance", label: "Surveillance", icon: Activity },
  { id: "database", label: "Centre d'audit", icon: Database },
  { id: "settings", label: "Paramètres", icon: Settings },
]

export default function SidebarNav({ activeTab, onTabChange, alertCount, collapsed = false }: SidebarNavProps) {
  return (
    <nav className={cn("py-4", collapsed ? "space-y-2 px-2" : "space-y-1 px-3")}>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex items-center rounded-md text-sm font-medium transition-all duration-200",
              collapsed ? "mx-auto h-11 w-11 justify-center p-0" : "w-full gap-3 px-3 py-2.5",
              isActive
                ? "bg-white/8 text-white border border-white/10 shadow-lg shadow-black/10"
                : "text-slate-300 hover:text-white hover:bg-white/5",
            )}
          >
            <span className={cn(
              "inline-flex items-center justify-center shrink-0",
              collapsed ? "h-8 w-8 rounded-md bg-white/5" : "h-8 w-8 rounded-md bg-white/5",
              isActive && "bg-cyan-400/12",
            )}>
              <Icon size={collapsed ? 16 : 17} className={cn(isActive ? "text-cyan-300" : "text-slate-300")} />
            </span>
            <span className={cn("truncate", collapsed && "hidden")}>{item.label}</span>
            {!collapsed && item.id === "surveillance" && alertCount > 0 && (
              <span className="ml-auto px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[10px] font-bold tabular-nums border border-rose-400/20">
                {alertCount > 99 ? "99+" : alertCount}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
