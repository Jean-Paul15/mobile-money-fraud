import { useState, useEffect, useRef, useCallback } from "react"
import type { Transaction, FraudAlert, KPIData, BlockedTransaction, FeedbackAction } from "../types"
import { generateTransaction } from "../lib/generators"
import { updateKpis, createAlerts, createBlockedTx } from "../lib/fraud-processor"
import { scoreTransaction } from "./useApi"

export function useFraudStream() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [blockedTx, setBlockedTx] = useState<BlockedTransaction[]>([])
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [kpi, setKpi] = useState<KPIData>({ totalScanned: 0, fraudDetected: 0, fraudBlocked: 0, detectionRate: 0, avgScore: 0, avgSpeedMs: 0 })
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(2000)
  const [fraudRate, setFraudRate] = useState(0.15)

  const isRunningRef = useRef(isRunning)
  const speedRef = useRef(speed)
  const fraudRateRef = useRef(fraudRate)
  useEffect(() => { isRunningRef.current = isRunning }, [isRunning])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { fraudRateRef.current = fraudRate }, [fraudRate])

  useEffect(() => {
    if (!isRunning) return
    let timeoutId: ReturnType<typeof setTimeout>
    let running = true

    const tick = async () => {
      if (!running) return
      const newTx = generateTransaction(fraudRateRef.current)
      const scoredTx = await scoreTransaction(newTx)
      setTransactions((prev) => [scoredTx, ...prev].slice(0, 200))
      setKpi((prev) => updateKpis(prev, scoredTx))
      const newAlerts = createAlerts(scoredTx)
      if (newAlerts.length > 0) setAlerts((prev) => [...newAlerts, ...prev].slice(0, 100))
      const blocked = createBlockedTx(scoredTx)
      if (blocked) setBlockedTx((prev) => [blocked, ...prev])
      if (running) timeoutId = setTimeout(tick, speedRef.current)
    }

    timeoutId = setTimeout(tick, 500)
    return () => { running = false; clearTimeout(timeoutId) }
  }, [isRunning])

  const toggleRunning = useCallback(() => setIsRunning((prev) => !prev), [])
  const selectTransaction = useCallback((tx: Transaction) => setSelectedTx(tx), [])

  const markFalsePositive = useCallback((txId: string) => {
    setTransactions((prev) => prev.map((tx) => tx.id === txId ? { ...tx, feedback: "false_positive" as FeedbackAction } : tx))
    setAlerts((prev) => prev.filter((a) => a.transaction_id !== txId))
    setBlockedTx((prev) => prev.map((btx) => btx.id === txId ? { ...btx, reviewed: true, feedback: "false_positive" as FeedbackAction } : btx))
    setSelectedTx((prev) => prev && prev.id === txId ? { ...prev, feedback: "false_positive" as FeedbackAction } : prev)
  }, [])

  const markConfirmedFraud = useCallback((txId: string) => {
    setTransactions((prev) => prev.map((tx) => tx.id === txId ? { ...tx, feedback: "confirmed_fraud" as FeedbackAction } : tx))
    setBlockedTx((prev) => prev.map((btx) => btx.id === txId ? { ...btx, reviewed: true, feedback: "confirmed_fraud" as FeedbackAction } : btx))
    setSelectedTx((prev) => prev && prev.id === txId ? { ...prev, feedback: "confirmed_fraud" as FeedbackAction } : prev)
  }, [])

  const resetAll = useCallback(() => {
    setIsRunning(false)
    setTransactions([]); setAlerts([]); setBlockedTx([]); setSelectedTx(null)
    setKpi({ totalScanned: 0, fraudDetected: 0, fraudBlocked: 0, detectionRate: 0, avgScore: 0, avgSpeedMs: 0 })
  }, [])

  const clearDatabase = useCallback(() => {
    setTransactions([])
    setAlerts([])
    setBlockedTx([])
    setSelectedTx(null)
    setKpi({ totalScanned: 0, fraudDetected: 0, fraudBlocked: 0, detectionRate: 0, avgScore: 0, avgSpeedMs: 0 })
  }, [])

  return { transactions, alerts, blockedTx, selectedTx, kpi, isRunning, speed, fraudRate,
    setSpeed, setFraudRate, toggleRunning, selectTransaction, markFalsePositive, markConfirmedFraud, resetAll, clearDatabase }
}
