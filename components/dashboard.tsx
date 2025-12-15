"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, AlertTriangle } from "lucide-react"

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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto h-[calc(100vh-3rem)] grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ліва колонка */}
        <div className="flex flex-col gap-4">
          {/* Час і дата */}
          <Card
            className="bg-card/20 backdrop-blur-lg border-border/50 p-8 animate-fadeInUp"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-[0.3em] uppercase text-muted-foreground">
                Софіївська Борщагівка
              </h2>
              <h1 className="text-7xl md:text-8xl font-bold text-foreground tracking-tight">{formatTime(time)}</h1>
              <p className="text-xl text-muted-foreground">{formatDate(time)}</p>
            </div>
          </Card>

          {weather && (
            <Card
              className="bg-card/20 backdrop-blur-lg border-border/50 p-6 animate-fadeInUp"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-5xl font-bold text-foreground">{weather.current.temperature}°C</p>
                  <p className="text-lg text-muted-foreground mt-2">
                    {getWeatherDescription(weather.current.weatherCode)}
                  </p>
                </div>
                {(() => {
                  const Icon = getWeatherIcon(weather.current.weatherCode)
                  return <Icon className="w-20 h-20 text-primary animate-pulse" />
                })()}
              </div>
            </Card>
          )}

          {/* Прогноз на 4 дні */}
          {weather && (
            <Card
              className="bg-card/20 backdrop-blur-lg border-border/50 p-6 animate-fadeInUp flex-1 flex flex-col justify-between"
              style={{ animationDelay: "0.3s" }}
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
                          <p className="text-lg font-bold text-foreground">{weather.daily.temperature_2m_max[index]}°</p>
                          <p className="text-sm text-muted-foreground">{weather.daily.temperature_2m_min[index]}°</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground/80">
                  Розроблено{" "}
                  <a
                    href="https://www.kostrov.work/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    kostrov.work
                  </a>
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Права колонка */}
        <div className="flex flex-col gap-4">
          <Card
            className={`backdrop-blur-lg border-border/50 p-6 animate-fadeInUp transition-all duration-500 ${
              hasActiveAlert ? "bg-red-500/30 animate-pulse border-red-500/70" : "bg-card/20"
            }`}
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className={`w-6 h-6 ${hasActiveAlert ? "text-red-500" : "text-muted-foreground"}`} />
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
                      <span className={`font-bold ${alert.activeAlert ? "text-red-500 text-lg" : "text-green-500"}`}>
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

          <Card
            className="bg-card/20 backdrop-blur-lg border-border/50 p-4 animate-fadeInUp flex-1 overflow-hidden"
            style={{ animationDelay: "0.5s" }}
          >
            <div className="h-full flex items-center justify-center">
              {!imageError ? (
                <img
                  src="https://raw.githubusercontent.com/Baskerville42/outage-data-ua/main/images/kyiv-region/gpv-5-2-summary.png"
                  alt="Графік від GPV"
                  className="w-4/5 h-4/5 object-contain rounded-lg"
                  onError={() => setImageError(true)}
                />
              ) : (
                <p className="text-muted-foreground text-sm">Зображення недоступне</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
