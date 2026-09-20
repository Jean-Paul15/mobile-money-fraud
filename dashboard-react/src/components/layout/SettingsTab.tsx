import { Settings, Activity } from "lucide-react"
import { Card } from "../ui/card"
import { Separator } from "../ui/separator"

export default function SettingsTab() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
        <Settings size={20} className="text-dark-400" />Paramètres
      </h2>
      <Card padding="lg" className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-white mb-2">Configuration du moteur</h3>
          <p className="text-xs text-dark-400 mb-4">
            Ces paramètres sont ajustables depuis la sidebar pendant la simulation.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card padding="md" variant="glass">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-accent-light" />
              <span className="text-sm font-medium text-white">Backend FastAPI</span>
            </div>
            <p className="text-xs text-dark-400">
              Connecte sur <code className="text-accent-light bg-dark-800 px-1 py-0.5 rounded text-xs">http://localhost:8002</code>
            </p>
          </Card>
          <Card padding="md" variant="glass">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-white">Mode Simulation</span>
            </div>
            <p className="text-xs text-dark-400">
              Génération de transactions avec 7 patterns de fraude réalistes
            </p>
          </Card>
        </div>
        <Separator variant="subtle" />
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">A propos</h3>
          <p className="text-xs text-dark-400 leading-relaxed">
            PayLink Africa - Système de détection de fraude pour transactions Mobile Money.
            Ce dashboard permet la surveillance en temps réel des transactions, l'investigation
            des cas suspects avec explicabilité (XAI), et la consultation du journal d'audit.
          </p>
        </div>
      </Card>
    </div>
  )
}
