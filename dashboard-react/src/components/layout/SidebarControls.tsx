import { Zap, AlertTriangle } from "lucide-react"

interface SidebarControlsProps {
  speed: number
  onSpeedChange: (speed: number) => void
  fraudRate: number
  onFraudRateChange: (rate: number) => void
  collapsed?: boolean
}

const sliderClass = "w-full h-1.5 rounded-full appearance-none bg-dark-700 cursor-pointer " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer " +
  "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"

export default function SidebarControls({ speed, onSpeedChange, fraudRate, onFraudRateChange, collapsed = false }: SidebarControlsProps) {
  if (collapsed) return null
  return (
    <div className="px-4 py-3 space-y-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Contrôles</span>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Zap size={13} /><span>Vitesse</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono tabular-nums">{speed}ms</span>
        </div>
        <input type="range" min={500} max={5000} step={100} value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className={sliderClass + " [&::-webkit-slider-thumb]:bg-sky-400"} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <AlertTriangle size={13} /><span>Taux fraude</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono tabular-nums">{(fraudRate * 100).toFixed(0)}%</span>
        </div>
        <input type="range" min={0} max={50} step={1} value={Math.round(fraudRate * 100)}
          onChange={(e) => onFraudRateChange(Number(e.target.value) / 100)}
          className={sliderClass + " [&::-webkit-slider-thumb]:bg-amber-400"} />
      </div>
    </div>
  )
}
