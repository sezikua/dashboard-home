import { NextResponse } from "next/server"

// Простий кеш у памʼяті, щоб не викликати зовнішнє API частіше, ніж раз на 30 секунд
let cachedAlerts: any[] | null = null
let cachedOblastString: string | null = null
let lastFetchTime = 0
let lastError: { status?: number; message?: string; details?: any } | null = null
const CACHE_TTL_MS = 30_000

export async function GET() {
  const now = Date.now()

  // Якщо кеш протермінувався — оновлюємо його одним запитом для всіх користувачів
  if (!cachedAlerts || now - lastFetchTime > CACHE_TTL_MS) {
    lastError = null // Скидаємо помилку перед новим запитом
    
    try {
      const apiToken = process.env.UKRAINE_ALARM_API_KEY || ""
      
      if (!apiToken) {
        const errorMsg = "API токен не налаштований! Встановіть UKRAINE_ALARM_API_KEY в змінних середовища."
        console.error(`❌ ${errorMsg}`)
        lastError = { message: errorMsg }
      }
      
      // Використовуємо Authorization header (краще для безпеки)
      const headers = apiToken ? {
        'Authorization': `Bearer ${apiToken}`,
      } : {}
      
      const [alertsRes, oblastRes] = await Promise.all([
        fetch(`https://api.alerts.in.ua/v1/alerts/active.json${apiToken ? `?token=${apiToken}` : ''}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`https://api.alerts.in.ua/v1/iot/active_air_raid_alerts_by_oblast.json${apiToken ? `?token=${apiToken}` : ''}`, {
          headers,
          cache: "no-store",
        }),
      ])

      if (!alertsRes.ok) {
        const errorText = await alertsRes.text().catch(() => 'Не вдалося прочитати помилку')
        const errorDetails = {
          status: alertsRes.status,
          statusText: alertsRes.statusText,
          url: alertsRes.url,
          error: errorText,
          hasToken: !!apiToken
        }
        console.error(`❌ API тривог повернуло помилку:`, errorDetails)
        lastError = {
          status: alertsRes.status,
          message: `API повернуло помилку: ${alertsRes.status} ${alertsRes.statusText}`,
          details: errorDetails
        }
        // Не оновлюємо cachedAlerts, щоб не затерти останні валідні дані
      } else {
        try {
          const data = await alertsRes.json()
          // API повертає об'єкт з полем alerts, яке містить масив
          cachedAlerts = Array.isArray(data.alerts) ? data.alerts : (Array.isArray(data) ? data : [])
          lastFetchTime = now
          console.log(`✅ API тривог: отримано ${cachedAlerts.length} записів`)
        } catch (parseError) {
          console.error("❌ Помилка парсингу відповіді API тривог:", parseError)
        }
      }

      if (!oblastRes.ok) {
        const errorText = await oblastRes.text().catch(() => 'Не вдалося прочитати помилку')
        console.error(`❌ API IoT тривог повернуло помилку:`, {
          status: oblastRes.status,
          statusText: oblastRes.statusText,
          url: oblastRes.url,
          error: errorText
        })
      } else {
        try {
          // Відповідь містить рядок типу "ANNNN...", беремо як є
          const text = await oblastRes.text()
          cachedOblastString = text.replace(/"/g, "").trim()
        } catch (parseError) {
          console.error("❌ Помилка парсингу відповіді API IoT:", parseError)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Невідома помилка'
      console.error("❌ Критична помилка API тривог:", error)
      lastError = {
        message: `Критична помилка: ${errorMessage}`,
        details: error
      }
      // У разі помилки залишаємо попередні дані, якщо вони були
    }
  }

  const hasData = Array.isArray(cachedAlerts) && cachedAlerts.length > 0

  return NextResponse.json({
    ok: hasData,
    alerts: hasData ? cachedAlerts : [],
    oblastString: cachedOblastString || null,
    error: lastError || undefined, // Додаємо інформацію про помилку, якщо є
  })
}
