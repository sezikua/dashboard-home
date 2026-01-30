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

// Компонент круглого індикатора батареї
function BatteryCircle({ 
  capacity, 
  isCharging, 
  timeToEmpty, 
  timeToFull 
}: { 
  capacity: number
  isCharging: boolean
  timeToEmpty?: string
  timeToFull?: string
}) {
  const [particles, setParticles] = useState<Array<{ id: number; delay: number; x: number; duration: number }>>([])
  
  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      delay: i * 0.15,
      x: (Math.random() - 0.5) * 50,
      duration: 2 + Math.random() * 1.5,
    }))
    setParticles(newParticles)
  }, [])

  const normalizedCapacity = Math.min(100, Math.max(0, capacity))
  const radius = 110
  const strokeWidth = 14
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const offset = circumference - (normalizedCapacity / 100) * circumference

  // Визначаємо колір на основі відсотка
  const getColor = () => {
    if (normalizedCapacity > 60) return { main: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' } // зелений
    if (normalizedCapacity > 30) return { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' } // жовтий
    return { main: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' } // червоний
  }

  const color = getColor()
  const particleColor = isCharging ? '#10b981' : '#ef4444'
  const particleGlow = isCharging ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      <div className="relative flex items-center justify-center mb-4 w-[280px] h-[280px] md:w-[320px] md:h-[320px]">
        {/* Частинки енергії */}
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-2.5 h-2.5 rounded-full"
              style={{
                background: `radial-gradient(circle, ${particleColor} 0%, ${particleColor}00 70%)`,
                boxShadow: `0 0 12px ${particleGlow}, 0 0 24px ${particleGlow}`,
                left: `calc(50% + ${particle.x}px)`,
                animation: isCharging 
                  ? `energyRise ${particle.duration}s ease-in-out infinite`
                  : `energyFall ${particle.duration}s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Зовнішнє світіння */}
        <div 
          className="absolute inset-0 rounded-full blur-3xl opacity-20"
          style={{
            background: `radial-gradient(circle, ${color.glow} 0%, transparent 70%)`,
            animation: 'pulse 3s ease-in-out infinite'
          }}
        />

        {/* Обертові декоративні кільця */}
        <div 
          className="absolute inset-12 rounded-full border border-dashed opacity-5"
          style={{
            borderColor: color.main,
            animation: 'rotate 20s linear infinite'
          }}
        />

        {/* SVG Кільце */}
        <svg width={radius * 2} height={radius * 2} className="relative z-10">
          <defs>
            <linearGradient id={`grad-${normalizedCapacity}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color.main} stopOpacity="1" />
              <stop offset="100%" stopColor={color.main} stopOpacity="0.7" />
            </linearGradient>
            
            <filter id={`glow-${normalizedCapacity}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Фонове кільце */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={strokeWidth}
          />
          
          {/* Внутрішня тінь */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius - 6}
            fill="none"
            stroke="#0a0a0a"
            strokeWidth="1"
            opacity="0.5"
          />
          
          {/* Прогрес кільце */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={`url(#grad-${normalizedCapacity})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            filter={`url(#glow-${normalizedCapacity})`}
            className="transition-all duration-1000 ease-out"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
          
          {/* Внутрішнє світіння */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius - 10}
            fill="none"
            stroke={color.main}
            strokeWidth="0.5"
            opacity="0.2"
            style={{ animation: 'pulse 2.5s ease-in-out infinite' }}
          />
        </svg>

        {/* Відсотки в центрі */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div 
            className="text-6xl md:text-8xl font-bold leading-none tabular-nums"
            style={{ 
              color: color.main,
              textShadow: `0 0 30px ${color.glow}, 0 0 60px ${color.glow}`,
              filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))'
            }}
          >
            {Math.round(normalizedCapacity)}
            <span className="text-3xl md:text-4xl opacity-60">%</span>
          </div>
          {isCharging && (
            <BatteryCharging className="w-5 h-5 md:w-7 md:h-7 text-emerald-400 mt-2 animate-pulse drop-shadow-lg" />
          )}
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm md:text-base text-white/80 font-semibold uppercase tracking-wider">
          Акумулятор
        </p>
        {timeToEmpty && (
          <p className="text-xs md:text-sm text-white/70">
            Вистачить: <span className="font-bold text-white">{timeToEmpty}</span>
          </p>
        )}
        {timeToFull && (
          <p className="text-xs md:text-sm text-white/70">
            До 100%: <span className="font-bold text-emerald-300">{timeToFull}</span>
          </p>
        )}
      </div>
    </div>
  )
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

  const gridPowerW = hasGrid ? Math.max(0, loadPower - batteryPower) : 0
  const inverterPowerW = batteryPower > 0 ? batteryPower : 0

  const chargingPowerW = batteryPower < 0 ? Math.abs(batteryPower) : 0
  const remainingPercent = 100 - capacity
  const remainingWh = (remainingPercent / 100) * BATTERY_CAPACITY_WH
  const timeToFullSec = chargingPowerW > 0 ? (remainingWh / chargingPowerW) * 3600 : 0

  const currentWh = (capacity / 100) * BATTERY_CAPACITY_WH
  const timeToEmptySec = inverterPowerW > 0 ? (currentWh / inverterPowerW) * 3600 : 0

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
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

  // Визначаємо колір для блоку мережі
  const gridColorClass = hasGrid
    ? "from-emerald-500/30 to-emerald-600/20 border-emerald-400/30"
    : "from-amber-500/30 to-orange-600/20 border-amber-400/30"
  const gridIconColor = hasGrid ? "text-emerald-300" : "text-amber-300"
  const gridTextColor = hasGrid ? "text-emerald-300" : "text-amber-300"

  return (
    <div className="h-screen px-2 py-1.5 md:px-4 md:py-3 flex flex-col overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col gap-1.5 md:gap-3 overflow-hidden">
        {/* Кнопка оновлення та час - компактно */}
        <div className="flex items-center justify-end gap-1.5 mb-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              fetchInverter()
            }}
            disabled={loading}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors"
            aria-label="Оновити"
          >
            <RefreshCw
              className={`w-3 h-3 text-white/60 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-white/50">
            <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
            <span className="hidden sm:inline">{formatExhibitionTime(data?.exhibitionTime)}</span>
            <span className="sm:hidden">
              {data?.exhibitionTime
                ? new Date(data.exhibitionTime.replace(" ", "T")).toLocaleTimeString("uk-UA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
          </div>
        </div>

        {/* Блок Мережа на всю ширину */}
        <Card
          className={`relative overflow-hidden bg-gradient-to-br ${gridColorClass} backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg p-3 md:p-5 border flex-shrink-0`}
        >
          <div className="absolute -top-8 -right-8 md:-top-12 md:-right-12 w-32 h-32 md:w-40 md:h-40 rounded-full blur-3xl opacity-20 bg-emerald-500" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasGrid ? (
                <Plug className={`w-5 h-5 md:w-6 md:h-6 ${gridIconColor}`} />
              ) : (
                <PlugZap className={`w-5 h-5 md:w-6 md:h-6 ${gridIconColor}`} />
              )}
              <div>
                <p className="text-xs md:text-sm text-white/70 uppercase tracking-wider font-medium mb-1">
                  Мережа
                </p>
                <p className={`text-2xl md:text-3xl font-bold ${gridTextColor} tabular-nums`}>
                  {hasGrid ? "Є мережа" : "Немає мережі"}
                </p>
              </div>
            </div>
            {hasGrid && typeof data?.acVoltage === "number" && (
              <div className="text-right">
                <p className="text-[10px] md:text-xs text-white/60 mb-1">Напруга</p>
                <p className="text-lg md:text-xl font-semibold text-white/90 tabular-nums">
                  {data.acVoltage.toFixed(1)} В
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Сітка блоків 2x2 */}
        <div className="grid grid-cols-2 gap-1.5 md:gap-3 flex-shrink-0">
          {/* Споживання */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/30 to-blue-600/20 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 border border-blue-400/30">
            <div className="absolute -top-6 -right-6 md:-top-8 md:-right-8 w-20 h-20 md:w-24 md:h-24 rounded-full blur-2xl opacity-20 bg-blue-500" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-blue-300" />
                <p className="text-[10px] md:text-xs text-white/70 uppercase tracking-wider font-medium">
                  Споживання
                </p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-white tabular-nums">
                {loadPower}
                <span className="text-sm md:text-base font-normal text-white/70 ml-1">Вт</span>
              </p>
            </div>
          </Card>

          {/* Мережа (споживання з мережі) */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 border border-cyan-400/30">
            <div className="absolute -top-6 -right-6 md:-top-8 md:-right-8 w-20 h-20 md:w-24 md:h-24 rounded-full blur-2xl opacity-20 bg-cyan-500" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                <Plug className="w-4 h-4 md:w-5 md:h-5 text-cyan-300" />
                <p className="text-[10px] md:text-xs text-white/70 uppercase tracking-wider font-medium">
                  Мережа
                </p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-white tabular-nums">
                {gridPowerW}
                <span className="text-sm md:text-base font-normal text-white/70 ml-1">Вт</span>
              </p>
            </div>
          </Card>

          {/* Акумулятор */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/30 to-orange-600/20 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 border border-amber-400/30">
            <div className="absolute -top-6 -right-6 md:-top-8 md:-right-8 w-20 h-20 md:w-24 md:h-24 rounded-full blur-2xl opacity-20 bg-amber-500" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-amber-300" />
                <p className="text-[10px] md:text-xs text-white/70 uppercase tracking-wider font-medium">
                  Акумулятор
                </p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-white tabular-nums">
                {inverterPowerW}
                <span className="text-sm md:text-base font-normal text-white/70 ml-1">Вт</span>
              </p>
            </div>
          </Card>

          {/* Розряд */}
          {inverterPowerW > 0 ? (
            <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/30 to-red-600/20 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 border border-orange-400/30">
              <div className="absolute -top-6 -right-6 md:-top-8 md:-right-8 w-20 h-20 md:w-24 md:h-24 rounded-full blur-2xl opacity-20 bg-orange-500" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                  <Battery className="w-4 h-4 md:w-5 md:h-5 text-orange-300" />
                  <p className="text-[10px] md:text-xs text-white/70 uppercase tracking-wider font-medium">
                    Розряд
                  </p>
                </div>
                <p className="text-xl md:text-2xl font-bold text-white tabular-nums">
                  {inverterPowerW}
                  <span className="text-sm md:text-base font-normal text-white/70 ml-1">Вт</span>
                </p>
                <p className="text-[10px] md:text-xs text-white/60 mt-1">
                  {formatTimeToFull(timeToEmptySec)}
                </p>
              </div>
            </Card>
          ) : hasGrid && chargingPowerW > 0 ? (
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/30 to-green-600/20 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 border border-emerald-400/30">
              <div className="absolute -top-6 -right-6 md:-top-8 md:-right-8 w-20 h-20 md:w-24 md:h-24 rounded-full blur-2xl opacity-20 bg-emerald-500" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                  <BatteryCharging className="w-4 h-4 md:w-5 md:h-5 text-emerald-300" />
                  <p className="text-[10px] md:text-xs text-white/70 uppercase tracking-wider font-medium">
                    Зарядка
                  </p>
                </div>
                <p className="text-xl md:text-2xl font-bold text-white tabular-nums">
                  {chargingPowerW}
                  <span className="text-sm md:text-base font-normal text-white/70 ml-1">Вт</span>
                </p>
                <p className="text-[10px] md:text-xs text-white/60 mt-1">
                  До 100%: {formatTimeToFull(timeToFullSec)}
                </p>
              </div>
            </Card>
          ) : (
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-500/20 to-slate-600/20 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 border border-white/10">
              <div className="relative">
                <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                  <Battery className="w-4 h-4 md:w-5 md:h-5 text-white/40" />
                  <p className="text-[10px] md:text-xs text-white/50 uppercase tracking-wider font-medium">
                    Розряд
                  </p>
                </div>
                <p className="text-xl md:text-2xl font-bold text-white/40 tabular-nums">
                  0
                  <span className="text-sm md:text-base font-normal text-white/40 ml-1">Вт</span>
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Круглий блок батареї - по центру */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-slate-950/80 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-6 border border-white/10 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-amber-500/10" />
          <div className="absolute -top-12 -right-12 md:-top-16 md:-right-16 w-32 h-32 md:w-40 md:h-40 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 md:-bottom-16 md:-left-16 w-32 h-32 md:w-40 md:h-40 bg-amber-500/20 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-center">
            <BatteryCircle 
              capacity={capacity} 
              isCharging={batteryPower < 0}
              timeToEmpty={inverterPowerW > 0 ? formatTimeToFull(timeToEmptySec) : undefined}
              timeToFull={hasGrid && chargingPowerW > 0 ? formatTimeToFull(timeToFullSec) : undefined}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
