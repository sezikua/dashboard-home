"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  CloudDrizzle,
  AlertTriangle,
  Clock,
  Zap,
  ZapOff,
  RefreshCw,
  Calendar,
  ChevronRight,
} from "lucide-react"
import { NotificationsToggle } from "@/components/notifications-toggle"

interface WeatherData {
  current: {
    temperature: number
    weatherCode: number
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    weatherCode: number[]
  }
}

interface AlertRegion {
  regionId: string
  regionName: string
  activeAlert: boolean
  notes?: string | null
}

const weatherIcons: Record<number, typeof Sun> = {
  0: Sun, // Ясно
  1: Sun, // Переважно ясно
  2: Cloud, // Частково хмарно
  3: Cloud, // Хмарно
  45: Cloud, // Туман
  48: Cloud, // Туман з інеєм
  51: CloudDrizzle, // Мряка легка
  53: CloudDrizzle, // Мряка помірна
  55: CloudDrizzle, // Мряка сильна
  61: CloudRain, // Дощ легкий
  63: CloudRain, // Дощ помірний
  65: CloudRain, // Дощ сильний
  71: CloudSnow, // Сніг легкий
  73: CloudSnow, // Сніг помірний
  75: CloudSnow, // Сніг сильний
  80: CloudRain, // Злива легка
  81: CloudRain, // Злива помірна
  82: CloudRain, // Злива сильна
  95: CloudRain, // Гроза
}

const weatherDescriptions: Record<number, string> = {
  0: "Ясно",
  1: "Переважно ясно",
  2: "Частково хмарно",
  3: "Хмарно",
  45: "Туман",
  48: "Туман",
  51: "Мряка",
  53: "Мряка",
  55: "Мряка",
  61: "Дощ",
  63: "Дощ",
  65: "Сильний дощ",
  71: "Сніг",
  73: "Сніг",
  75: "Сильний сніг",
  80: "Злива",
  81: "Злива",
  82: "Сильна злива",
  95: "Гроза",
}

const monthNames = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
]

const dayNames = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

const fullDayNames = [
  "неділя",
  "понеділок",
  "вівторок",
  "середа",
  "четвер",
  "пʼятниця",
  "субота",
]

const OUTAGE_URL =
  "https://raw.githubusercontent.com/Baskerville42/outage-data-ua/main/data/kyiv-region.json"
const OUTAGE_GROUP = "GPV5.2"
const OUTAGE_GROUP_LABEL = "5.2"
const LOCAL_STORAGE_DATA_KEY = "outageScheduleData"
const LOCAL_STORAGE_UPDATED_AT_KEY = "outageScheduleUpdatedAt"

type OutageBaseStatus = "yes" | "no"

type OutageRawStatus = OutageBaseStatus | "first" | "second"

interface OutageRange {
  timeRange: string
  emoji: "🟢" | "🔴"
  text: string
  status: OutageBaseStatus
  startMinutes: number
  endMinutes: number
}

interface KyivRegionData {
  fact?: {
    data?: {
      [timestamp: string]: {
        [group: string]: {
          [hour: string]: OutageRawStatus
        }
      }
    }
  }
}

const formatKyivTime = (date: Date) =>
  date.toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Kiev",
  })

const formatKyivDate = (date: Date) => {
  const kyivDate = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Kiev" }))
  const day = kyivDate.getDate()
  const month = monthNames[kyivDate.getMonth()]
  const year = kyivDate.getFullYear()

  const weekdayIndex = kyivDate.getDay()
  const weekday = fullDayNames[weekdayIndex]

  return {
    label: `${weekday} ${day} ${month} ${year}`,
    date: kyivDate,
  }
}

const getKyivMidnightTimestamp = (offsetDays: number) => {
  const kyivNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kiev" }))
  kyivNow.setHours(0, 0, 0, 0)
  kyivNow.setDate(kyivNow.getDate() + offsetDays)
  return Math.floor(kyivNow.getTime() / 1000)
}

const buildHalfHourRanges = (groupData: { [hour: string]: OutageRawStatus } | undefined): OutageRange[] => {
  if (!groupData) return []

  const slots: OutageBaseStatus[] = []

  for (let h = 1; h <= 24; h++) {
    const key = String(h)
    const value = groupData[key] as OutageRawStatus | undefined
    if (!value) {
      // Якщо немає даних — вважаємо, що світло є
      slots.push("yes", "yes")
      continue
    }

    switch (value) {
      case "yes":
        slots.push("yes", "yes")
        break
      case "no":
        slots.push("no", "no")
        break
      case "first":
        slots.push("no", "yes")
        break
      case "second":
        slots.push("yes", "no")
        break
      default:
        slots.push("yes", "yes")
    }
  }

  if (slots.length === 0) return []

  const ranges: OutageRange[] = []

  let currentStatus: OutageBaseStatus = slots[0]
  let rangeStartIndex = 0

  const formatSlotTime = (slotIndex: number) => {
    const totalMinutes = slotIndex * 30
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    const hourStr = String(hour).padStart(2, "0")
    const minuteStr = minute.toString().padStart(2, "0")
    // 24:00 виглядає природно для кінця доби в таких графіках
    return `${hourStr}:${minuteStr}`
  }

  const pushRange = (startIndex: number, endIndex: number, status: OutageBaseStatus) => {
    const startTime = formatSlotTime(startIndex)
    const endTime = formatSlotTime(endIndex + 1)
    const emoji = status === "yes" ? "🟢" : "🔴"
    const text = status === "yes" ? "Світло буде" : "Світла не буде"

    const [startH, startM] = startTime.split(":").map(Number)
    const [endH, endM] = endTime.split(":").map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    ranges.push({
      timeRange: `${startTime}-${endTime}`,
      emoji,
      text,
      status,
      startMinutes,
      endMinutes,
    })
  }

  for (let i = 1; i < slots.length; i++) {
    if (slots[i] !== currentStatus) {
      pushRange(rangeStartIndex, i - 1, currentStatus)
      rangeStartIndex = i
      currentStatus = slots[i]
    }
  }

  pushRange(rangeStartIndex, slots.length - 1, currentStatus)

  return ranges
}

function useOutageSchedule() {
  const [todayRanges, setTodayRanges] = useState<OutageRange[] | null>(null)
  const [tomorrowRanges, setTomorrowRanges] = useState<OutageRange[] | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [usedCache, setUsedCache] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processData = (data: KyivRegionData) => {
    const factData = data?.fact?.data || {}
    const todayTs = String(getKyivMidnightTimestamp(0))
    const tomorrowTs = String(getKyivMidnightTimestamp(1))

    const todayGroup = factData[todayTs]?.[OUTAGE_GROUP]
    const tomorrowGroup = factData[tomorrowTs]?.[OUTAGE_GROUP]

    setTodayRanges(todayGroup ? buildHalfHourRanges(todayGroup) : null)
    setTomorrowRanges(tomorrowGroup ? buildHalfHourRanges(tomorrowGroup) : null)
  }

  useEffect(() => {
    let isMounted = true

    const loadFromCache = () => {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_DATA_KEY)
        const cachedUpdatedAt = localStorage.getItem(LOCAL_STORAGE_UPDATED_AT_KEY)
        if (!cached || !cachedUpdatedAt) return false

        const parsed: KyivRegionData = JSON.parse(cached)
        if (!parsed) return false

        if (!isMounted) return false

        processData(parsed)
        setLastUpdated(new Date(Number(cachedUpdatedAt)))
        setUsedCache(true)
        setIsLoading(false)
        return true
      } catch {
        return false
      }
    }

    const fetchData = async () => {
      try {
        const response = await fetch(OUTAGE_URL, { cache: "no-store" })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data: KyivRegionData = await response.json()

        if (!isMounted) return

        processData(data)
        const now = Date.now()
        setLastUpdated(new Date(now))
        setUsedCache(false)
        setError(null)

        localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(data))
        localStorage.setItem(LOCAL_STORAGE_UPDATED_AT_KEY, String(now))
        setIsLoading(false)
      } catch (err) {
        console.error("Помилка завантаження графіку відключень:", err)
        if (!isMounted) return

        const hasCache = loadFromCache()
        if (!hasCache) {
          setError("Не вдалося завантажити дані графіку.")
          setIsLoading(false)
        } else {
          setError("Показано останні збережені дані. Можливі неточності.")
        }
      }
    }

    // Спроба прочитати кеш одразу, щоб швидше показати дані
    const hadCache = loadFromCache()
    // Оновлюємо дані у фоновому режимі
    fetchData()
    if (!hadCache) {
      setIsLoading(true)
    }

    const interval = setInterval(fetchData, 120000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const isStale =
    lastUpdated != null ? Date.now() - lastUpdated.getTime() > 10 * 60 * 1000 : false

  return {
    todayRanges,
    tomorrowRanges,
    lastUpdated,
    isLoading,
    usedCache,
    isStale,
    error,
  }
}

function OutageScheduleCard() {
  const { todayRanges, tomorrowRanges, lastUpdated, isLoading, usedCache, isStale, error } =
    useOutageSchedule()

  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const kyivToday = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kiev" }))
  kyivToday.setHours(0, 0, 0, 0)
  const kyivTomorrow = new Date(kyivToday)
  kyivTomorrow.setDate(kyivTomorrow.getDate() + 1)

  const todayInfo = formatKyivDate(kyivToday)
  const tomorrowInfo = formatKyivDate(kyivTomorrow)

  const todayHasData = todayRanges && todayRanges.length > 0
  const tomorrowHasData = tomorrowRanges && tomorrowRanges.length > 0

  const tomorrowIsTrulyScheduled =
    tomorrowHasData &&
    tomorrowRanges!.some((r) => r.status === "no") &&
    !(tomorrowRanges!.length === 1 && tomorrowRanges![0].status === "yes" && tomorrowRanges![0].timeRange === "00:00-24:00")

  const buildTodayPeriods = () => {
    if (!todayHasData) return []
    return todayRanges!.map((r) => {
      const [start, end] = r.timeRange.split("-")
      const hasPower = r.status === "yes"
      return {
        start,
        end,
        hasPower,
        startMinutes: r.startMinutes,
        endMinutes: r.endMinutes === 0 ? 24 * 60 : r.endMinutes,
      }
    })
  }

  const scheduleData = buildTodayPeriods()

  const getCurrentPeriodIndex = () => {
    if (!scheduleData.length) return -1
    const kyivNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kiev" }))
    const nowMinutes = kyivNow.getHours() * 60 + kyivNow.getMinutes()
    return scheduleData.findIndex(
      (p) => nowMinutes >= p.startMinutes && nowMinutes < p.endMinutes,
    )
  }

  const currentPeriodIndex = getCurrentPeriodIndex()

  const currentPeriod =
    currentPeriodIndex !== -1 && scheduleData.length > 0 ? scheduleData[currentPeriodIndex] : null

  const getRemainingInfo = () => {
    if (!currentPeriod || !scheduleData.length) return null

    const kyivNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kiev" }))
    const nowMinutes = kyivNow.getHours() * 60 + kyivNow.getMinutes()

    let remainingMinutes = 0
    let title = ""

    if (currentPeriod.hasPower) {
      // Світло є: рахуємо час до кінця поточного інтервалу (ймовірного вимкнення)
      remainingMinutes = Math.max(currentPeriod.endMinutes - nowMinutes, 0)
      title = "До вимкнення світла"
    } else {
      // Світла немає: шукаємо перший інтервал зі світлом після поточного часу
      const nextOn = scheduleData.find(
        (p) => p.hasPower && p.startMinutes > nowMinutes,
      )
      if (!nextOn) {
        return {
          title: "До включення світла",
          text: "Немає даних",
        }
      }
      remainingMinutes = Math.max(nextOn.startMinutes - nowMinutes, 0)
      title = "До включення світла"
    }

    const hours = Math.floor(remainingMinutes / 60)
    const minutes = remainingMinutes % 60

    let text = ""
    if (hours > 0) {
      text += `${hours} год.`
    }
    if (minutes > 0) {
      if (text) text += " "
      text += `${minutes} хв.`
    }
    if (!text) {
      text = "менше хвилини"
    }

    return { title, text }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">Графік відключень</h2>
              <p className="text-[11px] text-muted-foreground truncate">
                {todayInfo.label} • Група {OUTAGE_GROUP_LABEL}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <RefreshCw className="w-3 h-3" />
                <span>Оновлено о {formatKyivTime(lastUpdated)}</span>
                {usedCache && <span className="text-[10px] opacity-80">(дані з кешу)</span>}
              </div>
            )}
            {isStale && (
              <p className="text-[10px] text-yellow-400">
                Дані старші за 10 хвилин — можливі неточності.
              </p>
            )}
            {error && (
              <p className="text-[10px] text-red-400 max-w-[220px] text-right">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {isLoading && !todayHasData && !tomorrowHasData ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Завантаження графіку...</p>
          </div>
        </div>
      ) : (
        // Неоновий варіант (основний)
        <div className="flex-1 pr-1 space-y-4">
          {/* Шкала часу */}
          {todayHasData && (
            <div className="relative h-10 bg-gray-900 rounded-xl overflow-hidden mb-4 shadow-inner shadow-gray-900/80 border border-gray-800">
              {scheduleData.map((period, idx) => {
                const startPercent = (period.startMinutes / (24 * 60)) * 100
                const endPercent = (period.endMinutes / (24 * 60)) * 100
                const width = endPercent - startPercent

                return (
                  <div
                    key={idx}
                    className={`absolute h-full transition-all duration-300 ease-in-out ${
                      period.hasPower
                        ? "bg-gradient-to-r from-emerald-500 to-green-600"
                        : "bg-gradient-to-r from-rose-500 to-red-600"
                    } ${
                      idx === currentPeriodIndex
                        ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-950 shadow-lg shadow-blue-500/50"
                        : ""
                    }`}
                    style={{ left: `${startPercent}%`, width: `${width}%` }}
                  />
                )
              })}

              {/* Поточний час */}
              {todayHasData && (
                (() => {
                  const kyivNow = new Date(
                    new Date().toLocaleString("en-US", { timeZone: "Europe/Kiev" }),
                  )
                  const nowMinutes = kyivNow.getHours() * 60 + kyivNow.getMinutes()
                  const left = (nowMinutes / (24 * 60)) * 100
                  return (
                <div
                  className="absolute top-0 h-full w-0.5 bg-blue-400 z-10 shadow-lg shadow-blue-500/50"
                      style={{ left: `${left}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap font-mono shadow-md shadow-blue-500/70">
                    {formatKyivTime(currentTime)}
                  </div>
                </div>
                  )
                })()
              )}
            </div>
          )}

          {/* Поточний статус */}
          {todayHasData && currentPeriod && (
            <div
              className={`mb-4 p-4 rounded-2xl transition-all duration-500 bg-gray-900 border-l-4 ${
                currentPeriod.hasPower
                  ? "border-emerald-500 shadow-xl shadow-emerald-500/20"
                  : "border-rose-500 shadow-xl shadow-rose-500/20"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-full ${
                      currentPeriod.hasPower
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/40"
                        : "bg-rose-600 text-white shadow-lg shadow-rose-500/40"
                    }`}
                  >
                    {currentPeriod.hasPower ? (
                      <Zap className="w-7 h-7" />
                    ) : (
                      <ZapOff className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 mb-1 uppercase tracking-[0.2em]">
                      Поточний статус
                    </p>
                    <p
                      className={`text-2xl font-extrabold ${
                        currentPeriod.hasPower ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {currentPeriod.hasPower ? "СВІТЛО Є" : "СВІТЛА НЕМАЄ"}
                    </p>
                  </div>
                </div>
                {(() => {
                  const info = getRemainingInfo()
                  if (!info) return null
                  return (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{info.title}</p>
                      <p className="text-2xl font-bold text-white">{info.text}</p>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Детальний розклад у dark-стилі */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-100 mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Розклад на 24 години
            </h3>
            {todayHasData ? (
              scheduleData.map((period, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border transition-all duration-300 ease-in-out ${
                    idx === currentPeriodIndex
                      ? "border-blue-500 shadow-xl shadow-blue-500/20 scale-[1.01]"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div
                    className={`flex items-center p-3 bg-gray-900/90 ${
                      idx === currentPeriodIndex ? "bg-gray-800/90" : ""
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                        period.hasPower
                          ? "bg-emerald-900/60 text-emerald-400"
                          : "bg-rose-900/60 text-rose-400"
                      }`}
                    >
                      {period.hasPower ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <ZapOff className="w-4 h-4" />
                      )}
                    </div>

                    <div className="ml-3 flex-grow">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-mono font-bold text-white">
                          {period.start}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                        <span className="text-lg font-mono font-bold text-white">
                          {period.end}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {(() => {
                          const [startH, startM] = period.start.split(":").map(Number)
                          const [endH, endM] = period.end.split(":").map(Number)
                          const durationMin = endH * 60 + endM - (startH * 60 + startM)
                          const hours = Math.floor(durationMin / 60)
                          const minutes = durationMin % 60
                          const hoursText = hours > 0 ? `${hours} год` : ""
                          const minutesText = minutes > 0 ? `${minutes} хв` : ""
                          return `${hoursText} ${minutesText}`.trim()
                        })()}
                      </p>
                    </div>

                    <div
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
                        period.hasPower
                          ? "bg-emerald-900/40 text-emerald-400 border-emerald-700"
                          : "bg-rose-900/40 text-rose-400 border-rose-700"
                      }`}
                    >
                      {period.hasPower ? "Є світло" : "Немає світла"}
                    </div>

                    {idx === currentPeriodIndex && (
                      <div className="ml-3 w-2 h-2 rounded-full bg-blue-400 shadow-md shadow-blue-400 animate-pulse" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">
                Дані на сьогодні для групи {OUTAGE_GROUP_LABEL} відсутні.
              </p>
            )}
          </div>

          {/* Завтра + легенда в спрощеному вигляді */}
          <div className="pt-3 border-t border-gray-800 space-y-2">
            {tomorrowIsTrulyScheduled ? (
              <>
                <p className="text-xs font-medium text-gray-100 mb-1">
                  Графік на завтра {tomorrowInfo.label}:
                </p>
                <ul className="space-y-1 text-[11px]">
                  {tomorrowRanges!.map((range, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-300">
                      <span className="font-mono text-[11px] text-gray-400 min-w-[90px]">
                        {range.timeRange}
                      </span>
                      <span className="whitespace-nowrap">{range.emoji}</span>
                      <span>{range.text}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-xs text-gray-400">
                Графік на завтра {tomorrowInfo.label} не сформовано.
              </p>
            )}

            <div className="pt-2 border-t border-gray-800">
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
                  <span>Енергія є</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-md shadow-rose-500/50" />
                  <span>Відключення</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-md shadow-blue-500/50" />
                  <span>Поточний час</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [time, setTime] = useState(new Date())
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [imageError, setImageError] = useState(false)
  const [alerts, setAlerts] = useState<AlertRegion[]>([])
  const [hasActiveAlert, setHasActiveAlert] = useState(false)
  const [alertsHasData, setAlertsHasData] = useState<boolean | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Софіївська Борщагівка координати: 50.4014, 30.3706
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=50.4014&longitude=30.3706&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe/Kyiv&forecast_days=4",
    )
      .then((res) => res.json())
      .then((data) => {
        setWeather({
          current: {
            temperature: Math.round(data.current.temperature_2m),
            weatherCode: data.current.weather_code,
          },
          daily: {
            time: data.daily.time,
            temperature_2m_max: data.daily.temperature_2m_max.map(Math.round),
            temperature_2m_min: data.daily.temperature_2m_min.map(Math.round),
            weatherCode: data.daily.weather_code,
          },
        })
      })
      .catch((error) => console.error("Помилка завантаження погоди:", error))
  }, [])

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch("/api/alerts")
        const result = await response.json()

        const data = Array.isArray(result.alerts) ? result.alerts : []

        const targetRegions = [
          { id: "31", name: "м. Київ" },
          { id: "14", name: "Київська область" },
          { id: "701", name: "Борщагівська ТГ" },
        ]

        const regionAlerts: AlertRegion[] = targetRegions.map((region) => {
          const alertData = data.find((item: any) => item.regionId === region.id)
          return {
            regionId: region.id,
            regionName: region.name,
            activeAlert: alertData?.activeAlert || false,
            notes: alertData?.notes ?? null,
          }
        })

        setAlerts(regionAlerts)
        setHasActiveAlert(regionAlerts.some((alert) => alert.activeAlert))
        setAlertsHasData(result.ok)
      } catch (error) {
        // Якщо не вдалося завантажити тривоги — показуємо повідомлення про відсутність даних
        setAlerts([])
        setHasActiveAlert(false)
        setAlertsHasData(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  const formatDate = (date: Date) => {
    const day = date.getDate()
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  const getWeatherIcon = (code: number) => {
    const Icon = weatherIcons[code] || Cloud
    return Icon
  }

  const getWeatherDescription = (code: number) => {
    return weatherDescriptions[code] || "Хмарно"
  }

  return (
    <div className="min-h-screen pt-10 px-4 pb-4 md:pt-6 md:px-6 md:pb-6 flex flex-col">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Час і поточна погода (у верхньому лівому куті) */}
        <div className="order-1 lg:order-1 lg:col-span-1 flex flex-col gap-4">
          <div className="flex flex-row md:grid md:grid-cols-2 gap-3 md:gap-4 items-stretch">
            {/* Поточна погода — зліва на мобільних, праворуч на десктопі */}
            {weather && (
              <Card
                className="basis-2/5 md:basis-auto bg-card/5 backdrop-blur-lg border-border/30 p-4 md:p-5 animate-fadeInUp order-1 md:order-2"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="flex items-center justify-between gap-3 md:gap-4">
                  <div>
                    <p className="text-3xl md:text-5xl font-bold text-foreground">
                      {weather.current.temperature}°C
                    </p>
                    <p className="text-sm md:text-lg text-muted-foreground mt-1.5">
                      {getWeatherDescription(weather.current.weatherCode)}
                    </p>
                  </div>
                  {(() => {
                    const Icon = getWeatherIcon(weather.current.weatherCode)
                    return (
                      <Icon className="w-14 h-14 md:w-20 md:h-20 text-primary animate-pulse" />
                    )
                  })()}
                </div>
              </Card>
            )}

            {/* Час і дата */}
            <Card
              className="basis-3/5 md:basis-auto bg-card/5 backdrop-blur-lg border-border/30 px-4 py-4 md:px-8 md:py-6 animate-fadeInUp order-2 md:order-1"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="space-y-1.5">
                <h2 className="text-sm md:text-base font-semibold tracking-[0.3em] uppercase text-muted-foreground text-center md:text-left">
                  Софіївська Борщагівка
                </h2>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight text-center md:text-left">
                  {formatTime(time)}
                </h1>
                <p className="text-base md:text-xl text-muted-foreground text-center md:text-left">
                  {formatDate(time)}
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Графік відключень: на мобільному одразу після часу, на десктопі справа на всю висоту */}
        <div className="order-2 lg:order-2 lg:col-span-1 lg:row-span-3 flex flex-col">
          <Card
            className="bg-card/20 backdrop-blur-lg border-border/50 p-3 animate-fadeInUp flex-1 overflow-hidden"
            style={{ animationDelay: "0.2s" }}
          >
            <OutageScheduleCard />
          </Card>
        </div>

        {/* Блок тривог: на мобільному після графіка, на десктопі під прогнозом */}
        <div className="order-3 lg:order-4 lg:col-span-1">
          <Card
            className={`backdrop-blur-lg border-border/40 p-5 animate-fadeInUp transition-all duration-500 ${
              hasActiveAlert ? "bg-red-500/25 animate-pulse border-red-500/70" : "bg-card/10"
            }`}
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle
                className={`w-6 h-6 ${hasActiveAlert ? "text-red-500" : "text-muted-foreground"}`}
              />
              <h2 className="text-xl font-semibold text-foreground">Повітряна тривога</h2>
            </div>
            <div className="space-y-3">
              {alertsHasData === false && (
                <p className="text-sm text-yellow-400">
                  Немає даних з сервера про тривоги. Перевірте підключення або спробуйте пізніше.
                </p>
              )}

              {alertsHasData !== false &&
                alerts.map((alert) => (
                  <div key={alert.regionId} className="p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{alert.regionName}</span>
                      <span
                        className={`font-bold ${
                          alert.activeAlert ? "text-red-500 text-lg" : "text-green-500"
                        }`}
                      >
                        {alert.activeAlert ? "ТРИВОГА!" : "Немає тривоги"}
                      </span>
                    </div>
                    {alert.notes && (
                      <p className="mt-2 text-xs text-muted-foreground leading-snug">
                        {alert.notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </Card>
        </div>

        {/* Прогноз погоди: мобільний — внизу після всього, десктоп — під блоком з часом */}
        {weather && (
          <div className="order-4 lg:order-3 lg:col-span-1">
            <Card
              className="bg-card/20 backdrop-blur-lg border-border/50 p-6 animate-fadeInUp flex flex-col justify-between"
              style={{ animationDelay: "0.25s" }}
            >
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Прогноз на 4 дні</h2>
                <div className="grid grid-cols-4 gap-3">
                  {weather.daily.time.map((date, index) => {
                    const dayDate = new Date(date)
                    const dayName = dayNames[dayDate.getDay()]
                    const Icon = getWeatherIcon(weather.daily.weatherCode[index])

                    return (
                      <div
                        key={date}
                        className="bg-secondary/30 rounded-lg p-3 text-center hover:bg-secondary/50 transition-all duration-300"
                      >
                        <p className="text-sm text-muted-foreground mb-2">{dayName}</p>
                        <Icon className="w-8 h-8 mx-auto text-primary mb-2" />
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-foreground">
                            {weather.daily.temperature_2m_max[index]}°
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {weather.daily.temperature_2m_min[index]}°
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

          <NotificationsToggle />
          </div>
        )}
      </div>

      <div className="mt-2 w-full text-center text-[10px] text-muted-foreground/60">
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

