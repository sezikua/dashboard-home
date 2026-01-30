"use client"

import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import {
  Zap,
  ZapOff,
  Battery,
  BatteryCharging,
  Activity,
  RefreshCw,
  Clock,
  Plug,
  PlugZap,
  AlertCircle,
} from "lucide-react"

const BATTERY_CAPACITY_WH = 5120 // 5.12 kWh

interface InverterData {
  exhibitionTime?: string
  states?: string
  acVoltage?: number
  acFrequency?: number
  outputVoltage?: number
  outputFrequency?: number
  loadPower?: number
  batteryVoltage?: number
  batteryCurrent?: number
  batteryPower?: number
  capacityPercentage?: number
  lastUpdate?: string
  powerId?: number
  inverterId?: number
}

function formatTimeToFull(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h} год ${m} хв`
  if (h > 0) return `${h} год`
  if (m > 0) return `${m} хв`
  return "< 1 хв"
}

/** Формат exhibitionTime: "2026-01-30 09:18:37" */
function formatExhibitionTime(exhibitionTime?: string): string {
  if (!exhibitionTime?.trim()) return "—"
  try {
    const iso = exhibitionTime.trim().replace(" ", "T")
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return exhibitionTime
    return d.toLocaleString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  } catch {
    return exhibitionTime
  }
}

export default function InverterDashboard() {
  const [data, setData] = useState<InverterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInverter = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/inverter", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || `Помилка ${res.status}`)
        setData(null)
        return
      }
      if (json.status === "success" && json.data) {
        setData(json.data as InverterData)
      } else {
        setError("Невірна відповідь сервера")
        setData(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInverter()
    const interval = setInterval(fetchInverter, 15000)
    return () => clearInterval(interval)
  }, [fetchInverter])

  const hasGrid = data != null && typeof data.acVoltage === "number" && data.acVoltage > 50
  const loadPower = data?.loadPower ?? 0
  const batteryPower = data?.batteryPower ?? 0
  const capacity = data?.capacityPercentage ?? 0

  const gridPowerW = hasGrid
    ? Math.max(0, loadPower - batteryPower)
    : 0
  const inverterPowerW = batteryPower > 0 ? batteryPower : 0

  const chargingPowerW = batteryPower < 0 ? Math.abs(batteryPower) : 0
  const remainingPercent = 100 - capacity
  const remainingWh = (remainingPercent / 100) * BATTERY_CAPACITY_WH
  const timeToFullSec =
    chargingPowerW > 0 ? (remainingWh / chargingPowerW) * 3600 : 0

  const currentWh = (capacity / 100) * BATTERY_CAPACITY_WH
  const timeToEmptySec =
    inverterPowerW > 0 ? (currentWh / inverterPowerW) * 3600 : 0

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Завантаження даних інвертора...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-950/70 border-red-500/30 backdrop-blur-xl rounded-3xl p-6">
          <div className="flex items-center gap-3 text-red-400 mb-2">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <span className="font-semibold">Помилка отримання даних</span>
          </div>
          <p className="text-sm text-white/80 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              fetchInverter()
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Повторити
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-10 px-4 pb-4 md:pt-6 md:px-6 md:pb-6 flex flex-col">
      <div className="max-w-4xl mx-auto w-full space-y-5">
        {/* Заголовок і час оновлення */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shrink-0">
              <Battery className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                Інвертор та енергоспоживання
              </h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Ємність акумулятора 5,12 кВт·год
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                fetchInverter()
              }}
              disabled={loading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
              aria-label="Оновити"
            >
              <RefreshCw
                className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Оновлено: {formatExhibitionTime(data?.exhibitionTime)}</span>
            </div>
          </div>
        </div>

        {/* Мережа: є / нема */}
        <Card className="relative overflow-hidden bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.7)] p-4 md:p-6">
          <div
            className={`absolute inset-0 opacity-25 ${
              hasGrid
                ? "bg-gradient-to-br from-emerald-500/30 via-transparent to-blue-500/20"
                : "bg-gradient-to-br from-amber-500/20 via-transparent to-orange-500/20"
            }`}
          />
          <div
            className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 ${
              hasGrid ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <div className="relative flex items-center gap-4 md:gap-6">
            <div
              className={`flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center ${
                hasGrid
                  ? "bg-gradient-to-br from-emerald-500/50 to-emerald-600/30"
                  : "bg-gradient-to-br from-amber-500/50 to-orange-600/30"
              }`}
            >
              {hasGrid ? (
                <Plug className="w-8 h-8 md:w-9 md:h-9 text-emerald-200" />
              ) : (
                <PlugZap className="w-8 h-8 md:w-9 md:h-9 text-amber-200" />
              )}
            </div>
            <div>
              <p className="text-[11px] text-white/60 uppercase tracking-wider font-semibold mb-0.5">
                Мережа зараз
              </p>
              <p
                className={`text-2xl md:text-3xl font-bold ${
                  hasGrid ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {hasGrid ? "Є мережа" : "Немає мережі"}
              </p>
              {hasGrid && typeof data?.acVoltage === "number" && (
                <p className="text-xs text-white/60 mt-1">
                  Напруга мережі: {data.acVoltage.toFixed(1)} В
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Споживання з мережі та з інвертора */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="relative overflow-hidden bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.7)] p-4 md:p-5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/30 flex items-center justify-center">
                <Plug className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-medium">
                  Споживання з мережі
                </p>
                <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                  {gridPowerW}
                  <span className="text-lg font-normal text-white/70 ml-1">Вт</span>
                </p>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.7)] p-4 md:p-5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-medium">
                  Споживання з інвертора (батарея)
                </p>
                <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                  {inverterPowerW}
                  <span className="text-lg font-normal text-white/70 ml-1">Вт</span>
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Загальне навантаження */}
        <Card className="relative overflow-hidden bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.7)] p-4 md:p-5">
          <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/20 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-sky-500/30 flex items-center justify-center">
              <Activity className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <p className="text-[11px] text-white/60 uppercase tracking-wider font-medium">
                Загальне навантаження
              </p>
              <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                {loadPower}
                <span className="text-lg font-normal text-white/70 ml-1">Вт</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Батарея: стан, заряд, зарядка/розряд */}
        <Card className="relative overflow-hidden bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.8)] p-4 md:p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-amber-500/10" />
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-violet-500/30 flex items-center justify-center">
                {batteryPower < 0 ? (
                  <BatteryCharging className="w-6 h-6 text-emerald-300" />
                ) : (
                  <Battery className="w-6 h-6 text-violet-300" />
                )}
              </div>
              <div>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">
                  Акумулятор
                </p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {capacity}%
                </p>
              </div>
            </div>
            {/* Прогрес-бар заряду */}
            <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-5">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-violet-500 to-emerald-500"
                style={{ width: `${Math.min(100, Math.max(0, capacity))}%` }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hasGrid && chargingPowerW > 0 && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-[11px] text-white/60 uppercase tracking-wider font-medium mb-1">
                    Зарядка від мережі
                  </p>
                  <p className="text-xl font-bold text-emerald-300 tabular-nums">
                    {chargingPowerW} Вт
                  </p>
                  <p className="text-xs text-white/60 mt-2">
                    До 100% при поточній потужності:{" "}
                    <span className="text-white/90 font-medium">
                      {formatTimeToFull(timeToFullSec)}
                    </span>
                  </p>
                </div>
              )}
              {inverterPowerW > 0 && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-[11px] text-white/60 uppercase tracking-wider font-medium mb-1">
                    Розряд при поточному споживанні
                  </p>
                  <p className="text-xl font-bold text-amber-300 tabular-nums">
                    {inverterPowerW} Вт
                  </p>
                  <p className="text-xs text-white/60 mt-2">
                    Вистачить приблизно:{" "}
                    <span className="text-white/90 font-medium">
                      {formatTimeToFull(timeToEmptySec)}
                    </span>
                  </p>
                </div>
              )}
            </div>
            {!hasGrid && inverterPowerW === 0 && capacity >= 0 && (
              <p className="text-xs text-white/50 mt-2">
                Мережі немає, навантаження не споживає батарею або дані очікуються.
              </p>
            )}
          </div>
        </Card>

        {/* Додаткові параметри */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {typeof data?.batteryVoltage === "number" && (
            <Card className="bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-2xl p-3">
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Напруга АБ</p>
              <p className="text-lg font-bold text-white tabular-nums">{data.batteryVoltage.toFixed(1)} В</p>
            </Card>
          )}
          {typeof data?.batteryCurrent === "number" && (
            <Card className="bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-2xl p-3">
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Струм АБ</p>
              <p className="text-lg font-bold text-white tabular-nums">{data.batteryCurrent.toFixed(1)} А</p>
            </Card>
          )}
          {typeof data?.outputVoltage === "number" && (
            <Card className="bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-2xl p-3">
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Вихід V</p>
              <p className="text-lg font-bold text-white tabular-nums">{data.outputVoltage.toFixed(1)} В</p>
            </Card>
          )}
          {data?.states && (
            <Card className="bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-2xl p-3">
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Стан</p>
              <p className="text-sm font-semibold text-white capitalize">{data.states}</p>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-6 w-full text-center text-[10px] text-muted-foreground/60">
        Розроблено{" "}
        <a
          href="https://www.kostrov.work/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          kostrov.work
        </a>
      </div>
    </div>
  )
}
