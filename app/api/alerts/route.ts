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
      const apiToken = process.env.UKRAINE_ALARM_API_KEY || ""
      
      if (!apiToken) {
        console.error("❌ API токен не налаштований! Встановіть UKRAINE_ALARM_API_KEY в змінних середовища.")
      }
      
      // Використовуємо новий API alerts.in.ua з правильною авторизацією
      // Згідно з документацією: Authorization: Bearer <YOUR_APP_TOKEN>
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
        console.error(`❌ API тривог повернуло помилку:`, {
          status: alertsRes.status,
          statusText: alertsRes.statusText,
          error: errorText,
          hasToken: !!apiToken
        })
        // Не оновлюємо cachedAlerts, щоб не затерти останні валідні дані
      } else {
        try {
          const data = await alertsRes.json()
          // API alerts.in.ua повертає об'єкт з полем alerts, яке містить масив
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
      console.error("❌ Критична помилка API тривог:", error)
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
