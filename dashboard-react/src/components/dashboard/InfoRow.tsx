import { Phone } from "lucide-react"
import { cn } from "../../lib/utils"

interface InfoRowProps {
  icon: typeof Phone
  text: string
  mono?: boolean
  small?: boolean
}

export default function InfoRow({ icon: Icon, text, mono = false, small = false }: InfoRowProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-dark-300">
      <Icon size={14} className="text-dark-500 shrink-0" />
      <span className={cn(mono && "font-mono", small && "text-xs")}>{text}</span>
    </div>
  )
}
