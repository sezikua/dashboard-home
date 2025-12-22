"use client"

import { useEffect, useState, useRef } from "react"
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
  Activity,
  Timer,
  Sparkles,
} from "lucide-react"
import { NotificationsToggle } from "@/components/notifications-toggle"
import { AlertsWithMap } from "@/components/alerts-with-map"

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
  alertType?: string
  alertTypeName?: string
  startedAt?: string
  lastUpdate?: string
  alertsCount?: number
  notes?: string | null
  oblastStatus?: "full" | "partial" | "none"
}

interface DetailedAlert {
  regionId: string
  regionName: string
  regionType: string
  oblastId?: string
  oblastName?: string
  alertType: string
  alertTypeName: string
  alertIcon: string
  startedAt?: string
  lastUpdate: string
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

interface SchedulePeriod {
  start: string
  end: string
  hasPower: boolean
  startMinutes: number
  endMinutes: number
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
  const [prevScheduleHash, setPrevScheduleHash] = useState<string | null>(null)
  const sent30MinNotificationsRef = useRef<Set<string>>(new Set())

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

  const buildTodayPeriods = (): SchedulePeriod[] => {
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

  const scheduleData: SchedulePeriod[] = buildTodayPeriods()

  // Моніторинг графіку для відправки push-повідомлень
  useEffect(() => {
    if (!todayRanges || todayRanges.length === 0) return

    // Створюємо хеш графіку для порівняння (без урахування дати)
    const scheduleHash = JSON.stringify(
      todayRanges.map((r) => ({ timeRange: r.timeRange, status: r.status }))
    )

    // Перевірка зміни графіку (не враховуючи зміну дати)
    if (prevScheduleHash !== null && prevScheduleHash !== scheduleHash) {
      // Графік змінився - відправляємо push
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blackout_change",
          title: "Графік відключень змінено",
          message: "Графік відключень світла було оновлено. Перевірте актуальний розклад.",
          region: "kyiv",
        }),
      }).catch((err) => console.error("Помилка відправки push про зміну графіку:", err))
    }

    setPrevScheduleHash(scheduleHash)

    // Перевірка за 30 хвилин до відключення/включення світла
    const check30MinNotifications = () => {
      if (!scheduleData.length) return

      const kyivNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kiev" }))
      const nowMinutes = kyivNow.getHours() * 60 + kyivNow.getMinutes()

      // Перевіряємо всі періоди на сьогодні
      scheduleData.forEach((period) => {
        const notificationKey = `${period.startMinutes}-${period.endMinutes}-${period.hasPower ? "on" : "off"}`

        // Перевіряємо відключення світла (перехід зі світла на відсутність світла)
        if (period.hasPower === false) {
          const minutesUntilStart = period.startMinutes - nowMinutes
          // Якщо залишилось 30 хвилин до початку відключення
          if (minutesUntilStart >= 29 && minutesUntilStart <= 31) {
            if (!sent30MinNotificationsRef.current.has(notificationKey)) {
              fetch("/api/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "blackout_30min",
                  title: "Через 30 хвилин вимкнуть світло",
                  message: `Світло буде вимкнено о ${period.start}. Підготуйтесь до відключення.`,
                  region: "kyiv",
                }),
              }).catch((err) => console.error("Помилка відправки push про відключення:", err))

              sent30MinNotificationsRef.current.add(notificationKey)
            }
          }
        }

        // Перевіряємо включення світла (перехід з відсутності світла на світло)
        if (period.hasPower === true) {
          const minutesUntilStart = period.startMinutes - nowMinutes
          // Якщо залишилось 30 хвилин до початку включення
          if (minutesUntilStart >= 29 && minutesUntilStart <= 31) {
            if (!sent30MinNotificationsRef.current.has(notificationKey)) {
              fetch("/api/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "blackout_30min",
                  title: "Через 30 хвилин увімкнуть світло",
                  message: `Світло буде увімкнено о ${period.start}.`,
                  region: "kyiv",
                }),
              }).catch((err) => console.error("Помилка відправки push про включення:", err))

              sent30MinNotificationsRef.current.add(notificationKey)
            }
          }
        }
      })
    }

    // Перевіряємо кожну хвилину
    const interval = setInterval(check30MinNotifications, 60000) // Кожну хвилину
    check30MinNotifications() // Перевіряємо одразу

    // Очищаємо відправлені сповіщення при зміні графіку
    if (prevScheduleHash !== null && prevScheduleHash !== scheduleHash) {
      sent30MinNotificationsRef.current.clear()
    }

    return () => clearInterval(interval)
  }, [todayRanges, scheduleData, prevScheduleHash])

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

  const getStats = () => {
    if (!scheduleData.length) {
      return {
        percentage: 0,
        powerPeriods: 0,
        outagePeriods: 0,
      }
    }

    const totalMinutes = 24 * 60
    const powerMinutes = scheduleData.reduce((acc, period) => {
      if (!period.hasPower) return acc
      return acc + (period.endMinutes - period.startMinutes)
    }, 0)

    return {
      percentage: Math.round((powerMinutes / totalMinutes) * 100),
      powerPeriods: scheduleData.filter((p) => p.hasPower).length,
      outagePeriods: scheduleData.filter((p) => !p.hasPower).length,
    }
  }

  const stats = getStats()

  const MiniTimeline = ({ periods }: { periods: SchedulePeriod[] }) => {
    if (!periods.length) return null

    const kyivNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Kiev" }),
    )
    const nowMinutes = kyivNow.getHours() * 60 + kyivNow.getMinutes()

    const nowLeftPercent = (nowMinutes / (24 * 60)) * 100

    return (
      <div className="relative">
        {/* Поточний час як яскравий трикутник-стрілка над шкалою */}
        <div
          className="pointer-events-none absolute -top-3 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-sky-300 drop-shadow-[0_0_6px_rgba(125,211,252,0.9)]"
          style={{
            left: `${nowLeftPercent}%`,
            transform: "translateX(-50%)",
          }}
        />

        {/* Сама шкала */}
        <div className="relative h-3 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
          {periods.map((period, idx) => {
            const startPercent = (period.startMinutes / (24 * 60)) * 100
            const endPercent = (period.endMinutes / (24 * 60)) * 100
            const width = endPercent - startPercent
            const isCurrent =
              nowMinutes >= period.startMinutes && nowMinutes < period.endMinutes

            return (
              <div
                key={idx}
                className={`absolute h-full transition-all duration-500 ${
                  period.hasPower
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    : "bg-gradient-to-r from-rose-500 to-rose-400"
                } ${
                  isCurrent
                    ? "ring-2 ring-offset-[1px] ring-offset-slate-900 ring-blue-400 shadow-[0_0_20px_rgba(56,189,248,0.9)]"
                    : ""
                }`}
                style={{
                  left: `${startPercent}%`,
                  width: `${width}%`,
                }}
              />
            )
          })}
        </div>
      </div>
    )
  }

  const PeriodCard = ({
    period,
    idx,
    isActive,
  }: {
    period: SchedulePeriod
    idx: number
    isActive: boolean
  }) => {
    const [startH, startM] = period.start.split(":").map(Number)
    const [endH, endM] = period.end.split(":").map(Number)
    const durationMin = endH * 60 + endM - (startH * 60 + startM)
    const hours = Math.floor(durationMin / 60)
    const minutes = durationMin % 60

    return (
      <div
        className={`group relative overflow-hidden rounded-2xl transition-all duration-500 backdrop-blur-xl ${
          isActive
            ? period.hasPower
              ? "bg-gradient-to-br from-emerald-500/30 via-emerald-600/20 to-transparent border-2 border-emerald-400/50 shadow-2xl shadow-emerald-500/30 scale-[1.02]"
              : "bg-gradient-to-br from-rose-500/30 via-rose-600/20 to-transparent border-2 border-rose-400/50 shadow-2xl shadow-rose-500/30 scale-[1.02]"
            : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
        }`}
        style={{ animationDelay: `${idx * 50}ms` }}
      >
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${
            period.hasPower
              ? "bg-gradient-to-br from-emerald-500/20 via-transparent to-emerald-400/10"
              : "bg-gradient-to-br from-rose-500/20 via-transparent to-rose-400/10"
          }`}
        />

        <div
          className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 transition-opacity duration-700 group-hover:opacity-40 ${
            period.hasPower ? "bg-emerald-500" : "bg-rose-500"
          }`}
        />

        <div className="relative flex items-center p-4 md:p-5">
          <div
            className={`relative flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
              period.hasPower
                ? "bg-gradient-to-br from-emerald-500/40 to-emerald-600/20 group-hover:from-emerald-500/60 group-hover:to-emerald-600/30"
                : "bg-gradient-to-br from-rose-500/40 to-rose-600/20 group-hover:from-rose-500/60 group-hover:to-rose-600/30"
            }`}
          >
            <div
              className={`absolute inset-0 rounded-2xl blur-xl opacity-50 ${
                period.hasPower ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            {period.hasPower ? (
              <Zap className="relative w-7 h-7 md:w-8 md:h-8 text-emerald-300 drop-shadow-lg" />
            ) : (
              <ZapOff className="relative w-7 h-7 md:w-8 md:h-8 text-rose-300 drop-shadow-lg" />
            )}
          </div>

          <div className="ml-4 md:ml-5 flex-grow">
            <div className="flex items-center gap-2 md:gap-3 mb-1.5">
              <span className="text-2xl md:text-3xl font-bold text-white/95 font-mono tracking-tight drop-shadow-lg">
                {period.start}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              </div>
              <span className="text-2xl md:text-3xl font-bold text-white/95 font-mono tracking-tight drop-shadow-lg">
                {period.end}
              </span>
            </div>
            <p className="text-xs md:text-sm text-white/60 font-medium">
              {hours > 0 ? `${hours} год ` : ""}
              {minutes > 0 ? `${minutes} хв` : ""}
            </p>
          </div>

          <div
            className={`relative px-4 py-1.5 md:px-5 md:py-2.5 rounded-xl font-bold text-[11px] md:text-sm transition-all duration-500 backdrop-blur-sm ${
              period.hasPower
                ? "bg-emerald-500/30 text-emerald-200 group-hover:bg-emerald-500/40 shadow-lg shadow-emerald-500/30"
                : "bg-rose-500/30 text-rose-200 group-hover:bg-rose-500/40 shadow-lg shadow-rose-500/30"
            }`}
          >
            {period.hasPower ? "Світло є" : "Відключено"}
          </div>

          {isActive && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 rounded-r-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-400 rounded-full animate-ping" />
            </>
          )}
        </div>
      </div>
    )
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
        <div className="flex-1 pr-1 space-y-5">
          {/* Основний статус + статистика */}
          {todayHasData && currentPeriod && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl border border-white/20 p-4 md:p-6 shadow-2xl">
              <div
                className={`absolute inset-0 opacity-30 ${
                  currentPeriod.hasPower
                    ? "bg-gradient-to-br from-emerald-500/20 via-transparent to-blue-500/20"
                    : "bg-gradient-to-br from-rose-500/20 via-transparent to-orange-500/20"
                }`}
              />

              <div
                className={`absolute -top-16 -left-16 w-40 h-40 rounded-full blur-3xl opacity-25 ${
                  currentPeriod.hasPower ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <div
                className={`absolute -bottom-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-25 ${
                  currentPeriod.hasPower ? "bg-blue-500" : "bg-orange-500"
                }`}
              />

              <div className="relative grid md:grid-cols-3 gap-4 md:gap-5 items-center">
                {/* Поточний статус */}
                <div className="md:col-span-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`relative p-4 rounded-3xl ${
                        currentPeriod.hasPower
                          ? "bg-gradient-to-br from-emerald-500/40 to-emerald-600/20"
                          : "bg-gradient-to-br from-rose-500/40 to-rose-600/20"
                      }`}
                    >
                      <div
                        className={`absolute inset-0 rounded-3xl blur-2xl opacity-60 ${
                          currentPeriod.hasPower ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {currentPeriod.hasPower ? (
                        <Zap className="relative w-9 h-9 text-emerald-300 drop-shadow-2xl" />
                      ) : (
                        <ZapOff className="relative w-9 h-9 text-rose-300 drop-shadow-2xl" />
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] text-white/60 uppercase tracking-[0.2em] mb-1 font-semibold">
                        Зараз
                      </p>
                      <p
                        className={`text-2xl md:text-3xl font-bold drop-shadow-lg ${
                          currentPeriod.hasPower ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {currentPeriod.hasPower ? "Світло є" : "Відключено"}
                      </p>
                      <p className="text-xs text-white/60 mt-1">
                        {currentPeriod.start}–{currentPeriod.end}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const info = getRemainingInfo()
                    if (!info) return null
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Timer className="w-4 h-4 text-white/70" />
                          <span className="text-xs text-white/70 font-medium">
                            {info.title}
                          </span>
                        </div>
                        <p className="text-3xl md:text-4xl font-bold text-white font-mono tabular-nums drop-shadow-xl">
                          {info.text}
                        </p>
                      </div>
                    )
                  })()}
                </div>

                {/* Статистика за добу */}
                <div className="md:col-span-2 grid grid-cols-3 gap-2 md:gap-3">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 p-3 md:p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/20 rounded-full blur-2xl" />
                    <Activity className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mb-2 drop-shadow-lg relative" />
                    <p className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-1.5 drop-shadow-xl relative tabular-nums">
                      {stats.percentage}%
                    </p>
                    <p className="text-[10px] md:text-xs text-white/70 font-medium relative leading-snug break-words">
                      Світла за добу
                    </p>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 p-3 md:p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl" />
                    <Zap className="w-4 h-4 md:w-5 md:h-5 text-blue-400 mb-2 drop-shadow-lg relative" />
                    <p className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-1.5 drop-shadow-xl relative tabular-nums">
                      {stats.powerPeriods}
                    </p>
                    <p className="text-[10px] md:text-xs text-white/70 font-medium relative leading-snug break-words">
                      Періодів зі світлом
                    </p>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 p-3 md:p-4">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/20 rounded-full blur-2xl" />
                    <ZapOff className="w-4 h-4 md:w-5 md:h-5 text-rose-400 mb-2 drop-shadow-lg relative" />
                    <p className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-1.5 drop-shadow-xl relative tabular-nums">
                      {stats.outagePeriods}
                    </p>
                    <p className="text-[10px] md:text-xs text-white/70 font-medium relative leading-snug break-words">
                      Відключень за добу
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Шкала часу на сьогодні */}
          {todayHasData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Розклад на сьогодні
                </h3>
                <span className="text-[11px] text-gray-400">
                  00:00 – 24:00 • Група {OUTAGE_GROUP_LABEL}
                </span>
              </div>
              <MiniTimeline periods={scheduleData} />
            </div>
          )}

          {/* Детальні періоди на сьогодні */}
          <div className="space-y-2">
            {todayHasData ? (
              scheduleData.map((period, idx) => (
                <PeriodCard
                  key={idx}
                  period={period}
                  idx={idx}
                  isActive={idx === currentPeriodIndex}
                />
              ))
            ) : (
              <p className="text-xs text-gray-400">
                Дані на сьогодні для групи {OUTAGE_GROUP_LABEL} відсутні.
              </p>
            )}
          </div>

          {/* Завтра */}
          <div className="pt-3 border-t border-gray-800 space-y-2">
            {tomorrowIsTrulyScheduled ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <p className="text-xs font-medium text-gray-100">
                    Графік на завтра {tomorrowInfo.label}
                  </p>
                </div>
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
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <p>Графік на завтра {tomorrowInfo.label} не сформовано.</p>
              </div>
            )}
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
  const [detailedAlerts, setDetailedAlerts] = useState<DetailedAlert[]>([])
  const [oblastsWithAlerts, setOblastsWithAlerts] = useState<string[]>([])
  const [hasActiveAlert, setHasActiveAlert] = useState(false)
  const [alertsHasData, setAlertsHasData] = useState<boolean | null>(null)
  const [totalAlertsCount, setTotalAlertsCount] = useState(0)
  const [oblastsCount, setOblastsCount] = useState(0)
  const [apiError, setApiError] = useState<{ status?: number; message?: string } | null>(null)

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
        
        // Перевіряємо статус відповіді
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          setApiError({
            status: response.status,
            message: errorData.message || response.statusText || 'Невідома помилка'
          })
          console.error('❌ Помилка API:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          })
        } else {
          setApiError(null)
        }
        
        const result = await response.json()

        // Отримуємо дані з нового формату API
        const alertsData: AlertRegion[] = Array.isArray(result.alerts) ? result.alerts : []
        const detailedAlertsData: DetailedAlert[] = Array.isArray(result.detailedAlerts) ? result.detailedAlerts : []
        const oblastsWithAlertsData: string[] = Array.isArray(result.oblastsWithAlerts) ? result.oblastsWithAlerts : []
        
        // Логування для дебагу (тільки в development)
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 API тривог:', {
            ok: result.ok,
            областей_з_тривогою: result.oblastsCount || 0,
            всього_тривог: result.totalAlertsCount || 0,
            alerts: alertsData.length,
            detailedAlerts: detailedAlertsData.length,
          });
        }

        setAlerts(alertsData)
        setDetailedAlerts(detailedAlertsData)
        setOblastsWithAlerts(oblastsWithAlertsData)
        setTotalAlertsCount(result.totalAlertsCount || 0)
        setOblastsCount(result.oblastsCount || 0)
        setHasActiveAlert(alertsData.length > 0)
        setAlertsHasData(result.ok)
      } catch (error) {
        // Якщо не вдалося завантажити тривоги — показуємо повідомлення про відсутність даних
        console.error('❌ Помилка завантаження тривог:', error)
        setApiError({
          message: error instanceof Error ? error.message : 'Помилка завантаження даних'
        })
        setAlerts([])
        setDetailedAlerts([])
        setOblastsWithAlerts([])
        setTotalAlertsCount(0)
        setOblastsCount(0)
        setHasActiveAlert(false)
        setAlertsHasData(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Kiev",
    })
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
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-y-0 lg:gap-x-2 flex-1">
        {/* Час і поточна погода (у верхньому лівому куті) */}
        <div className="order-1 lg:order-1 lg:col-span-1 flex flex-col gap-3 lg:gap-[1px]">
          <div className="flex flex-row md:grid md:grid-cols-2 gap-3 md:gap-3 items-stretch">
            {/* Час і дата — зліва на мобільних */}
            <Card
              className="basis-[68%] md:basis-auto bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.7)] px-4 py-3 md:px-8 md:py-4 animate-fadeInUp order-1 md:order-1"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="space-y-1">
                <h2 className="text-sm md:text-base font-semibold tracking-[0.3em] uppercase text-muted-foreground text-center md:text-left">
                  Софіївська Борщагівка
                </h2>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight text-center md:text-left">
                  {formatTime(time)}
                </h1>
                <p className="text-base md:text-lg text-muted-foreground text-center md:text-left">
                  {formatDate(time)}
                </p>
              </div>
            </Card>

            {/* Поточна погода — анімований блок з динамічним фоном */}
            {weather && (
              <Card
                className="relative basis-[32%] md:basis-auto overflow-hidden border-white/10 backdrop-blur-xl rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.7)] p-4 md:p-6 animate-fadeInUp order-2 md:order-2"
                style={{ animationDelay: "0.1s" }}
              >
                {/* Динамічний фон залежно від погоди */}
                {(() => {
                  const code = weather.current.weatherCode

                  // Ясна погода (0, 1)
                  if (code === 0 || code === 1) {
                    return (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-orange-400/20 to-yellow-500/30" />
                        <div
                          className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/40 rounded-full blur-3xl animate-pulse"
                          style={{ animationDuration: "3s" }}
                        />
                        <div
                          className="absolute bottom-0 left-0 w-32 h-32 bg-orange-400/30 rounded-full blur-3xl animate-pulse"
                          style={{ animationDuration: "4s" }}
                        />
                        {/* Промені сонця */}
                        <div className="absolute inset-0 opacity-20">
                          {[...Array(8)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute top-1/2 left-1/2 w-1 h-20 bg-gradient-to-t from-transparent to-yellow-300"
                              style={{
                                transform: `rotate(${i * 45}deg) translateY(-50%)`,
                                transformOrigin: "0 0",
                                animation: `spin ${8 + i}s linear infinite`,
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )
                  }

                  // Хмарно (2, 3, 45, 48)
                  if (code === 2 || code === 3 || code === 45 || code === 48) {
                    return (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/30 via-gray-400/20 to-slate-600/30" />
                        <div
                          className="absolute top-1/4 right-1/4 w-48 h-48 bg-gray-400/30 rounded-full blur-3xl animate-pulse"
                          style={{ animationDuration: "5s" }}
                        />
                        <div
                          className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-slate-500/30 rounded-full blur-3xl animate-pulse"
                          style={{ animationDuration: "6s" }}
                        />
                        {/* Плаваючі хмари */}
                        <div className="absolute inset-0 opacity-10">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-32 h-16 bg-white rounded-full blur-2xl"
                              style={{
                                top: `${20 + i * 30}%`,
                                left: `${-10 + i * 15}%`,
                                animation: `float ${10 + i * 2}s ease-in-out infinite`,
                                animationDelay: `${i * 2}s`,
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )
                  }

                  // Дощ / Мряка
                  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
                    return (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-cyan-500/20 to-blue-700/30" />
                        <div
                          className="absolute top-0 right-0 w-48 h-48 bg-blue-500/40 rounded-full blur-3xl animate-pulse"
                          style={{ animationDuration: "3s" }}
                        />
                        <div
                          className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/30 rounded-full blur-3xl animate-pulse"
                          style={{ animationDuration: "4s" }}
                        />
                        {/* Краплі дощу */}
                        <div className="absolute inset-0 opacity-30">
                          {[...Array(20)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-0.5 h-8 bg-gradient-to-b from-blue-300 to-transparent rounded-full"
                              style={{
                                left: `${Math.random() * 100}%`,
                                top: `${-20 + Math.random() * 40}%`,
                                animation: `rain ${0.5 + Math.random() * 0.5}s linear infinite`,
                                animationDelay: `${Math.random() * 2}s`,
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )
                  }

                  // Сніг
                  if ([71, 73, 75].includes(code)) {
                    return (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/30 via-blue-200/20 to-white/30" />
                        <div
                          className="absolute top-1/4 left-1/4 w-48 h-48 bg-cyan-300/30 rounded-full blur-3xl animate-pulse"
                          style={{ animationDuration: "4s" }}
                        />
                        <div
                          className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-blue-200/30 rounded-full blur-3xl animate-pulse"
                          style={{ animationDuration: "5s" }}
                        />
                        {/* Сніжинки */}
                        <div className="absolute inset-0 opacity-40">
                          {[...Array(15)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-2 h-2 bg-white rounded-full"
                              style={{
                                left: `${Math.random() * 100}%`,
                                top: `${-10 + Math.random() * 30}%`,
                                animation: `snow ${3 + Math.random() * 2}s linear infinite`,
                                animationDelay: `${Math.random() * 3}s`,
                                filter: "blur(1px)",
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )
                  }

                  // Гроза
                  if (code === 95) {
                    return (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-indigo-700/30 to-purple-800/40" />
                        <div
                          className="absolute top-0 right-0 w-48 h-48 bg-purple-500/40 rounded-full blur-3xl animate-pulse"
                          style={{ animationDuration: "2s" }}
                        />
                        <div
                          className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-600/40 rounded-full blur-3xl animate-pulse"
                          style={{ animationDuration: "2.5s" }}
                        />
                        {/* Блискавки */}
                        <div className="absolute inset-0 opacity-50">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-1 h-20 bg-gradient-to-b from-yellow-300 via-white to-transparent"
                              style={{
                                left: `${20 + i * 30}%`,
                                top: "10%",
                                animation: `lightning ${2 + i * 0.5}s ease-in-out infinite`,
                                animationDelay: `${i * 0.7}s`,
                                transform: "skewX(-10deg)",
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )
                  }

                  // За замовчуванням
                  return (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-700/30 via-slate-600/20 to-slate-800/30" />
                      <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-slate-500/30 rounded-full blur-3xl animate-pulse"
                        style={{ animationDuration: "4s" }}
                      />
                    </>
                  )
                })()}

                {/* Overlay для кращої читабельності */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                {/* Контент */}
                <div className="relative h-full flex flex-col justify-between">
                  {/* Верхня частина - температура і іконка */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Температура */}
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <p className="text-4xl md:text-6xl font-bold text-white drop-shadow-2xl tabular-nums">
                          {weather.current.temperature}
                        </p>
                        <span className="text-2xl md:text-4xl font-bold text-white/80 drop-shadow-lg">
                          °C
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-white/90 font-medium drop-shadow-lg">
                        {getWeatherDescription(weather.current.weatherCode)}
                      </p>
                    </div>

                    {/* Анімована іконка погоди */}
                    <div className="relative">
                      <div
                        className="absolute inset-0 blur-2xl opacity-60"
                        style={{
                          background: (() => {
                            const code = weather.current.weatherCode
                            if (code === 0 || code === 1)
                              return "radial-gradient(circle, rgba(251,191,36,0.8) 0%, transparent 70%)"
                            if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
                              return "radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 70%)"
                            if ([71, 73, 75].includes(code))
                              return "radial-gradient(circle, rgba(165,243,252,0.8) 0%, transparent 70%)"
                            if (code === 95)
                              return "radial-gradient(circle, rgba(168,85,247,0.8) 0%, transparent 70%)"
                            return "radial-gradient(circle, rgba(148,163,184,0.6) 0%, transparent 70%)"
                          })(),
                        }}
                      />
                      {(() => {
                        const Icon = getWeatherIcon(weather.current.weatherCode)
                        return (
                          <Icon className="relative w-16 h-16 md:w-20 md:h-20 text-white drop-shadow-2xl animate-float" />
                        )
                      })()}
                    </div>
                  </div>

                  {/* Нижня частина - додаткова інформація */}
                  <div className="mt-4 pt-3 border-t border-white/20 space-y-2">
                    {/* Відчувається як */}
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-white/70 font-medium">Відчувається</span>
                      <span className="text-white font-semibold tabular-nums drop-shadow-lg">
                        {weather.current.temperature}°C
                      </span>
                    </div>

                    {/* Статус день/ніч */}
                    <div className="flex items-center gap-2">
                      {(() => {
                        const hour = new Date().getHours()
                        const isDay = hour >= 6 && hour < 20
                        return (
                          <>
                            {isDay ? (
                              <Sun className="w-4 h-4 text-yellow-300 drop-shadow-lg animate-pulse" />
                            ) : (
                              <div className="w-4 h-4 bg-gradient-to-br from-blue-300 to-indigo-400 rounded-full drop-shadow-lg animate-pulse" />
                            )}
                            <span className="text-xs text-white/70 font-medium">
                              {isDay ? "День" : "Ніч"}
                            </span>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Декоративний елемент */}
                  <div
                    className="absolute bottom-2 right-2 w-20 h-20 border border-white/10 rounded-full"
                    style={{
                      animation: "spin 20s linear infinite",
                    }}
                  />
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Графік відключень: на мобільному одразу після часу, на десктопі справа на всю висоту */}
        <div className="order-2 lg:order-2 lg:col-span-1 lg:row-span-3 flex flex-col">
          <Card
            className="bg-slate-950/70 border-white/10 backdrop-blur-xl rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.8)] p-3 animate-fadeInUp flex-1 overflow-hidden"
            style={{ animationDelay: "0.2s" }}
          >
            <OutageScheduleCard />
          </Card>
        </div>

        {/* Блок тривог: на мобільному після графіка, на десктопі під прогнозом */}
        <div className="order-3 lg:order-4 lg:col-span-1">
          <Card
            className={`backdrop-blur-xl rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.7)] border border-white/10 p-4 md:p-4 animate-fadeInUp transition-all duration-500 ${
              hasActiveAlert ? "bg-red-500/30 animate-pulse border-red-500/70" : "bg-slate-950/60"
            }`}
            style={{ animationDelay: "0.3s" }}
          >
            {apiError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-sm font-semibold text-red-400 mb-1">
                  Помилка API тривог
                </p>
                <p className="text-xs text-red-300">
                  Код помилки: <span className="font-mono font-bold">{apiError.status || 'N/A'}</span>
                </p>
                {apiError.message && (
                  <p className="text-xs text-red-300 mt-1">
                    {apiError.message}
                  </p>
                )}
                <p className="text-xs text-yellow-400 mt-2">
                  Перевірте логи сервера для деталей
                </p>
              </div>
            )}
            <AlertsWithMap
              alerts={alerts}
              detailedAlerts={detailedAlerts}
              oblastsWithAlerts={oblastsWithAlerts}
              hasActiveAlert={hasActiveAlert}
              alertsHasData={alertsHasData}
              totalAlertsCount={totalAlertsCount}
              oblastsCount={oblastsCount}
            />
          </Card>
        </div>

        {/* Прогноз погоди: мобільний — внизу після всього, десктоп — під блоком з часом */}
        {weather && (
          <div className="order-4 lg:order-3 lg:col-span-1">
            <Card
              className="relative overflow-hidden bg-gradient-to-br from-slate-950/70 via-slate-900/70 to-slate-950/70 border-white/10 backdrop-blur-xl rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.7)] p-4 md:p-5 animate-fadeInUp"
              style={{ animationDelay: "0.25s" }}
            >
              {/* Анімовані фонові елементи */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute top-0 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
                  style={{ animationDuration: "4s" }}
                />
                <div
                  className="absolute bottom-0 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
                  style={{ animationDuration: "5s" }}
                />
              </div>

              <div className="relative">
                {/* Заголовок з іконкою */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500/30 to-purple-500/20 rounded-xl backdrop-blur-sm border border-white/10">
                    <Calendar className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">
                      Прогноз погоди
                    </h2>
                    <p className="text-xs text-white/60">на найближчі 4 дні</p>
                  </div>
                </div>

                {/* Сітка карток днів */}
                <div className="grid grid-cols-4 gap-2 md:gap-3">
                  {weather.daily.time.map((date, index) => {
                    const dayDate = new Date(date)
                    const dayName = dayNames[dayDate.getDay()]
                    const Icon = getWeatherIcon(weather.daily.weatherCode[index])
                    const isToday = index === 0

                    return (
                      <div
                        key={date}
                        className={`group relative overflow-hidden rounded-2xl p-3 text-center transition-all duration-500 hover:scale-105 backdrop-blur-xl ${
                          isToday
                            ? "bg-gradient-to-br from-blue-500/30 via-blue-600/20 to-transparent border-2 border-blue-400/50 shadow-xl shadow-blue-500/30"
                            : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
                        }`}
                        style={{
                          animationDelay: `${index * 100}ms`,
                          animation: "fadeInUp 0.6s ease-out forwards",
                        }}
                      >
                        {/* Анімований градієнт при hover */}
                        <div
                          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${
                            isToday
                              ? "bg-gradient-to-br from-blue-400/20 via-transparent to-purple-400/20"
                              : "bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"
                          }`}
                        />

                        {/* Світяться орби */}
                        <div
                          className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 transition-opacity duration-700 group-hover:opacity-40 ${
                            isToday ? "bg-blue-500" : "bg-purple-500"
                          }`}
                        />

                        {/* Контент картки */}
                        <div className="relative space-y-2">
                          {/* День тижня */}
                          <p
                            className={`text-xs md:text-sm font-semibold uppercase tracking-wider ${
                              isToday ? "text-blue-300" : "text-white/70"
                            }`}
                          >
                            {isToday ? "Сьогодні" : dayName}
                          </p>

                          {/* Іконка погоди */}
                          <div className="relative">
                            <div
                              className={`absolute inset-0 blur-xl opacity-50 ${
                                isToday ? "bg-blue-400" : "bg-blue-300"
                              }`}
                            />
                            <Icon
                              className={`relative w-8 h-8 md:w-10 md:h-10 mx-auto transition-transform duration-300 group-hover:scale-110 ${
                                isToday ? "text-blue-300 drop-shadow-lg" : "text-blue-400"
                              }`}
                            />
                          </div>

                          {/* Температури */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-center gap-1">
                              <p
                                className={`text-xl md:text-2xl font-bold tabular-nums ${
                                  isToday ? "text-white drop-shadow-lg" : "text-white/95"
                                }`}
                              >
                                {weather.daily.temperature_2m_max[index]}°
                              </p>
                            </div>
                            <p className="text-sm md:text-base text-white/50 tabular-nums">
                              {weather.daily.temperature_2m_min[index]}°
                            </p>
                          </div>

                          {/* Індикатор сьогоднішнього дня */}
                          {isToday && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full shadow-lg shadow-blue-400/50" />
                          )}
                        </div>

                        {/* Pulse ефект для сьогоднішнього дня */}
                        {isToday && (
                          <div
                            className="absolute inset-0 rounded-2xl border-2 border-blue-400/30 animate-ping"
                            style={{ animationDuration: "3s" }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Мінітимлайн температур */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
                    {weather.daily.temperature_2m_max.map((temp, idx) => {
                      const maxTemp = Math.max(...weather.daily.temperature_2m_max)
                      const minTemp = Math.min(...weather.daily.temperature_2m_min)
                      const range = maxTemp - minTemp
                      const percentage = range > 0 ? ((temp - minTemp) / range) * 100 : 50

                      return (
                        <div
                          key={idx}
                          className="absolute h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all duration-700"
                          style={{
                            left: `${(idx / 4) * 100}%`,
                            width: `${100 / 4}%`,
                            opacity: 0.3 + (percentage / 100) * 0.7,
                            animationDelay: `${idx * 150}ms`,
                          }}
                        />
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-white/50">
                    <span>Min: {Math.min(...weather.daily.temperature_2m_min)}°</span>
                    <span>Max: {Math.max(...weather.daily.temperature_2m_max)}°</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Блок сповіщень: внизу сторінки, малопомітний */}
      <NotificationsToggle />

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

