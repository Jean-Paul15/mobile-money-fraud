import { Phone, MapPin, Radio, Calendar } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import InfoRow from "./InfoRow"
import { formatPhone } from "../../lib/utils"
import type { CustomerInfo } from "../../types"

interface ClientInfoCardProps { customer: CustomerInfo }

export default function ClientInfoCard({ customer }: ClientInfoCardProps) {
  return (
    <Card variant="elevated" padding="lg" className="h-full">
      <CardHeader>
        <CardTitle className="uppercase tracking-[0.22em] text-slate-300">Informations client</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
          <div className="text-sm font-semibold text-white">{customer.name}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Profil vérifié</div>
        </div>
        <div className="space-y-1.5">
          <InfoRow icon={Phone} text={formatPhone(customer.phone)} mono />
          <InfoRow icon={MapPin} text={customer.city} />
          <InfoRow icon={Radio} text={customer.operator} />
          <InfoRow icon={Calendar} text={`Compte cree il y a ${customer.account_age_days} jours`} />
        </div>
      </CardContent>
    </Card>
  )
}
