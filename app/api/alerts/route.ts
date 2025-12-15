import { NextResponse } from "next/server"

// Простий кеш у памʼяті, щоб не викликати зовнішнє API частіше, ніж раз на 30 секунд
let cachedAlerts: any[] | null = null
let lastFetchTime = 0
const CACHE_TTL_MS = 30_000

export async function GET() {
  const now = Date.now()

  // Якщо кеш протермінувався — оновлюємо його одним запитом для всіх користувачів
  if (!cachedAlerts || now - lastFetchTime > CACHE_TTL_MS) {
    try {
      const response = await fetch("https://api.ukrainealarm.com/api/v3/alerts", {
        headers: {
          Authorization: process.env.UKRAINE_ALARM_API_KEY || "",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        console.warn(`API тривог повернуло статус: ${response.status}`)
        // Не оновлюємо cachedAlerts, щоб не затерти останні валідні дані
      } else {
        const data = await response.json()
        cachedAlerts = Array.isArray(data) ? data : []
        lastFetchTime = now
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
  })
}
