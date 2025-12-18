import { NextResponse } from "next/server"

// Інтерфейси
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
  regionEngName?: string
  lastUpdate: string
  activeAlerts: ActiveAlert[]
}

// Список regionId областей (без районів та громад)
const OBLAST_IDS = [
  "3", "4", "5", "8", "9", "10", "11", "12", "13", "14", "15", "16",
  "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28",
  "29", "30", "31"
]

export async function GET() {
  const apiKey = process.env.UKRAINE_ALARM_API_KEY

  // Перевірка API ключа
  if (!apiKey) {
    console.error("UKRAINE_ALARM_API_KEY не налаштовано!")
    return NextResponse.json({
      ok: false,
      alerts: [],
      oblastString: null,
      error: "API ключ не налаштовано",
    })
  }

  try {
    // Запит до API регіонів
    // Документація ukrainealarm.com вказує формат: Authorization: {api_key}
    const regionsRes = await fetch("https://api.ukrainealarm.com/api/v3/regions", {
      method: "GET",
      headers: {
        "accept": "application/json",
        "Authorization": apiKey,
      },
      next: { revalidate: 30 }, // Кешування на 30 секунд
    })

    if (!regionsRes.ok) {
      const errorText = await regionsRes.text()
      console.error(`API регіонів повернуло статус: ${regionsRes.status}`, errorText)
      return NextResponse.json({
        ok: false,
        alerts: [],
        oblastString: null,
        error: `API помилка: ${regionsRes.status}`,
      })
    }

    const data: RegionData[] = await regionsRes.json()

    if (!Array.isArray(data)) {
      console.error("API повернуло невалідні дані:", data)
      return NextResponse.json({
        ok: false,
        alerts: [],
        oblastString: null,
        error: "Невалідні дані від API",
      })
    }

    // Фільтруємо тільки області
    const oblastData = data.filter((r) => OBLAST_IDS.includes(r.regionId))

    // Перетворюємо у формат для фронтенду
    const alerts = oblastData.map((region) => ({
      regionId: region.regionId,
      regionName: region.regionName,
      activeAlert: region.activeAlerts && region.activeAlerts.length > 0,
      lastUpdate: region.lastUpdate,
      alertTypes: region.activeAlerts?.map((a) => a.type) || [],
    }))

    // Запит до IoT API (опціонально)
    let oblastString: string | null = null
    try {
      const oblastRes = await fetch(
        "https://api.ukrainealarm.com/api/v1/iot/active_air_raid_alerts_by_oblast.json",
        { cache: "no-store" }
      )
      if (oblastRes.ok) {
        const text = await oblastRes.text()
        oblastString = text.replace(/"/g, "").trim()
      }
    } catch (e) {
      console.warn("Помилка IoT API:", e)
    }

    return NextResponse.json({
      ok: true,
      alerts,
      oblastString,
    })
  } catch (error) {
    console.error("Помилка API тривог:", error)
    return NextResponse.json({
      ok: false,
      alerts: [],
      oblastString: null,
      error: String(error),
    })
  }
}
