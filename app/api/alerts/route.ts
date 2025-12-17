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
      
      // Спочатку пробуємо новий API (alerts.in.ua)
      let alertsRes: Response | null = null
      let oblastRes: Response | null = null
      let useNewApi = false
      
      try {
        const headers = apiToken ? {
          'Authorization': `Bearer ${apiToken}`,
        } : {}
        
        const [newAlertsRes, newOblastRes] = await Promise.all([
          fetch(`https://api.alerts.in.ua/v1/alerts/active.json${apiToken ? `?token=${apiToken}` : ''}`, {
            headers,
            cache: "no-store",
          }),
          fetch(`https://api.alerts.in.ua/v1/iot/active_air_raid_alerts_by_oblast.json${apiToken ? `?token=${apiToken}` : ''}`, {
            headers,
            cache: "no-store",
          }),
        ])
        
        // Якщо новий API працює - використовуємо його
        if (newAlertsRes.ok) {
          alertsRes = newAlertsRes
          oblastRes = newOblastRes
          useNewApi = true
        } else if (newAlertsRes.status === 401 || newAlertsRes.status === 403 || newAlertsRes.status === 404) {
          // Якщо новий API повертає помилку авторизації - використовуємо старий
          console.warn(`⚠️ Новий API не працює (${newAlertsRes.status}), використовуємо старий API`)
        }
      } catch (newApiError) {
        console.warn(`⚠️ Помилка нового API, використовуємо старий API:`, newApiError)
      }
      
      // Fallback на старий API (ukrainealarm.com), якщо новий не працює
      if (!alertsRes) {
        const [oldAlertsRes, oldOblastRes] = await Promise.all([
          fetch("https://api.ukrainealarm.com/api/v3/alerts", {
            headers: {
              Authorization: apiToken || "",
            },
            cache: "no-store",
          }),
          fetch("https://api.ukrainealarm.com/api/v1/iot/active_air_raid_alerts_by_oblast.json", {
            cache: "no-store",
          }),
        ])
        alertsRes = oldAlertsRes
        oblastRes = oldOblastRes
        useNewApi = false
      }

      if (!alertsRes || !alertsRes.ok) {
        const errorText = alertsRes ? await alertsRes.text().catch(() => 'Не вдалося прочитати помилку') : 'Немає відповіді від API'
        const errorDetails = {
          status: alertsRes?.status || 0,
          statusText: alertsRes?.statusText || 'No Response',
          url: alertsRes?.url || 'Unknown',
          error: errorText,
          hasToken: !!apiToken
        }
        console.error(`❌ API тривог повернуло помилку:`, errorDetails)
        lastError = {
          status: alertsRes?.status || 0,
          message: `API повернуло помилку: ${alertsRes?.status || 0} ${alertsRes?.statusText || 'No Response'}`,
          details: errorDetails
        }
        // Не оновлюємо cachedAlerts, щоб не затерти останні валідні дані
      } else {
        try {
          const data = await alertsRes.json()
          // Новий API повертає об'єкт з полем alerts, старий - масив напряму
          if (useNewApi) {
            cachedAlerts = Array.isArray(data.alerts) ? data.alerts : (Array.isArray(data) ? data : [])
          } else {
            cachedAlerts = Array.isArray(data) ? data : []
          }
          lastFetchTime = now
          lastError = null // Скидаємо помилку, якщо дані успішно отримані
          console.log(`✅ API тривог (${useNewApi ? 'новий' : 'старий'}): отримано ${cachedAlerts.length} записів`)
        } catch (parseError) {
          console.error("❌ Помилка парсингу відповіді API тривог:", parseError)
        }
      }

      if (!oblastRes || !oblastRes.ok) {
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
