import { ArrowUpRight, ArrowDownLeft, CreditCard, Smartphone, Globe, Monitor, Wifi } from "lucide-react"

export const TYPE_ICONS: Record<string, typeof ArrowUpRight> = {
  transfer: ArrowUpRight, payment: CreditCard, withdrawal: ArrowDownLeft,
  recharge: Wifi, bill_pay: CreditCard,
}
export const TYPE_LABELS: Record<string, string> = {
  transfer: "Transfert", payment: "Paiement", withdrawal: "Retrait",
  recharge: "Recharge credit", bill_pay: "Paiement facture",
}
export const CHANNEL_ICONS: Record<string, typeof Smartphone> = {
  mobile_app: Smartphone, agent: Monitor, web: Globe, ussd: Monitor,
}
export const CHANNEL_LABELS: Record<string, string> = {
  mobile_app: "Application mobile", agent: "Agent agree", web: "Site web", ussd: "Code USSD",
}
