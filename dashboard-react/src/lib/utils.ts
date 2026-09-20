import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Formate un montant en FCFA (XOF) */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Formate un numero de telephone ouest-africain */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`
  }
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`
  }
  return phone
}

/** Timestamp relatif en francais */
export function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 5) return "a l'instant"
  if (diffSec < 60) return `il y a ${diffSec}s`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Formatte un timestamp ISO en date/heure lisible */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Couleur du texte selon le score (0-1) */
export function getScoreColor(score: number): string {
  if (score >= 0.7) return "text-red-400"
  if (score >= 0.5) return "text-amber-400"
  return "text-emerald-400"
}

/** Style de badge selon le score (0-1) */
export function getScoreBadgeStyle(score: number): string {
  if (score >= 0.7) return "bg-red-500/15 text-red-400 border-red-500/30"
  if (score >= 0.5) return "bg-amber-500/15 text-amber-400 border-amber-500/30"
  return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
}

/** Label de statut selon le score (0-1) */
export function getStatusLabel(score: number): string {
  if (score >= 0.7) return "CRITIQUE"
  if (score >= 0.5) return "SUSPECT"
  return "LEGITIME"
}

/** Variante de severite */
export function getSeverityVariant(severity: string): "critical" | "high" | "medium" | "low" {
  switch (severity) {
    case "CRITICAL": return "critical"
    case "HIGH": return "high"
    case "MEDIUM": return "medium"
    default: return "low"
  }
}

/** Formate un score 0-1 en pourcentage */
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

/** Tronque un ID long pour affichage */
export function truncateId(id: string, len: number = 8): string {
  return id.length > len ? id.slice(-len) : id
}

/** Genere un export CSV depuis un tableau d'objets */
export function exportCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: string; label: string }[],
  filename: string,
): void {
  const header = columns.map((c) => `"${c.label}"`).join(",")
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key]
        if (val === null || val === undefined) return '""'
        const str = typeof val === "string" ? val : JSON.stringify(val)
        return `"${str.replace(/"/g, '""')}"`
      })
      .join(","),
  )
  const csv = [header, ...rows].join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
