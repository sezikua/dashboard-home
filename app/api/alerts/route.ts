import { NextResponse } from "next/server"

// Інтерфейси для відповіді API
interface ActiveAlert {
  regionId: string
  regionType: string
  type: string
  lastUpdate: string
}

interface RegionData {
  regionId: string
  regionType: string
  regionName: string
  regionEngName: string
  lastUpdate: string
  activeAlerts: ActiveAlert[]
}

// Простий кеш у памʼяті, щоб не викликати зовнішнє API частіше, ніж раз на 30 секунд
let cachedRegions: RegionData[] | null = null
let cachedOblastString: string | null = null
let lastFetchTime = 0
const CACHE_TTL_MS = 30_000

// Список regionId областей (без районів та громад) для фільтрації
const OBLAST_IDS = [
  "3", "4", "5", "8", "9", "10", "11", "12", "13", "14", "15", "16",
  "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28",
  "29", "30", "31"
]

export async function GET() {
  const now = Date.now()

  // Якщо кеш протермінувався — оновлюємо його одним запитом для всіх користувачів
  if (!cachedRegions || now - lastFetchTime > CACHE_TTL_MS) {
    try {
      const [regionsRes, oblastRes] = await Promise.all([
        fetch("https://api.ukrainealarm.com/api/v3/regions", {
          headers: {
            accept: "application/json",
            Authorization: process.env.UKRAINE_ALARM_API_KEY || "",
          },
          cache: "no-store",
        }),
        fetch("https://api.ukrainealarm.com/api/v1/iot/active_air_raid_alerts_by_oblast.json", {
          cache: "no-store",
        }),
      ])

      if (!regionsRes.ok) {
        console.warn(`API регіонів повернуло статус: ${regionsRes.status}`)
        // Не оновлюємо cachedRegions, щоб не затерти останні валідні дані
      } else {
        const data: RegionData[] = await regionsRes.json()
        // Фільтруємо тільки області (без районів та громад)
        cachedRegions = Array.isArray(data)
          ? data.filter((r) => OBLAST_IDS.includes(r.regionId))
          : []
        lastFetchTime = now
      }

      if (!oblastRes.ok) {
        console.warn(`API IoT тривог повернуло статус: ${oblastRes.status}`)
      } else {
        // Відповідь містить рядок типу "ANNNN...", беремо як є
        const text = await oblastRes.text()
        cachedOblastString = text.replace(/"/g, "").trim()
      }
    } catch (error) {
      console.error("Помилка API тривог:", error)
      // У разі помилки залишаємо попередні дані, якщо вони були
    }
  }

  const hasData = Array.isArray(cachedRegions) && cachedRegions.length > 0

  // Перетворюємо дані регіонів у формат alerts для фронтенду
  const alerts = hasData
    ? cachedRegions!.map((region) => ({
        regionId: region.regionId,
        regionName: region.regionName,
        activeAlert: region.activeAlerts && region.activeAlerts.length > 0,
        lastUpdate: region.lastUpdate,
        alertTypes: region.activeAlerts?.map((a) => a.type) || [],
      }))
    : []

  return NextResponse.json({
    ok: hasData,
    alerts,
    oblastString: cachedOblastString || null,
  })
}
