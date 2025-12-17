import { NextResponse } from "next/server"

// Простий кеш у памʼяті, щоб не викликати зовнішнє API частіше, ніж раз на 30 секунд
let cachedAlerts: any[] | null = null
let cachedOblastString: string | null = null
let lastFetchTime = 0
const CACHE_TTL_MS = 30_000

export async function GET() {
  const now = Date.now()

  // Якщо кеш протермінувався — оновлюємо його одним запитом для всіх користувачів
  if (!cachedAlerts || now - lastFetchTime > CACHE_TTL_MS) {
    try {
      const [alertsRes, oblastRes] = await Promise.all([
        fetch("https://api.ukrainealarm.com/api/v3/alerts", {
          headers: {
            Authorization: process.env.UKRAINE_ALARM_API_KEY || "",
          },
          cache: "no-store",
        }),
        fetch("https://api.ukrainealarm.com/api/v1/iot/active_air_raid_alerts_by_oblast.json", {
          cache: "no-store",
        }),
      ])

      if (!alertsRes.ok) {
        console.warn(`API тривог повернуло статус: ${alertsRes.status}`)
        // Не оновлюємо cachedAlerts, щоб не затерти останні валідні дані
      } else {
        const data = await alertsRes.json()
        cachedAlerts = Array.isArray(data) ? data : []
        lastFetchTime = now
      }

      if (!oblastRes.ok) {
        console.warn(`API IoT тривог повернуло статус: ${oblastRes.status}`)
      } else {
        // Відповідь містить рядок типу \"ANNNN...\", беремо як є
        const text = await oblastRes.text()
        cachedOblastString = text.replace(/\"/g, \"\").trim()
      }
    } catch (error) {
      console.error("Помилка API тривог:", error)
      // У разі помилки залишаємо попередні дані, якщо вони були
    }
  }

  const hasData = Array.isArray(cachedAlerts) && cachedAlerts.length > 0

  return NextResponse.json({
    ok: hasData,
    alerts: hasData ? cachedAlerts : [],
    oblastString: cachedOblastString || null,
  })
}
