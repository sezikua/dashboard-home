import { NextRequest, NextResponse } from "next/server"

// Інтерфейс для даних від ukrainealarm.com
interface WebhookAlert {
  regionId: string
  regionType?: string
  regionName: string
  regionEngName?: string
  lastUpdate?: string
  activeAlerts?: Array<{
    regionId: string
    regionType?: string
    type: string
    lastUpdate: string
  }>
}

// Секретний токен для верифікації webhook (опціонально)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ""

export async function POST(request: NextRequest) {
  try {
    // Опціонально: перевірка секретного токена
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get("Authorization")
      if (authHeader !== WEBHOOK_SECRET) {
        console.warn("Webhook: невірний токен авторизації")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Отримуємо дані з тіла запиту
    const data: WebhookAlert = await request.json()

    // Валідація даних
    if (!data.regionId || !data.regionName) {
      console.warn("Webhook: невалідні дані", data)
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    // Логуємо отриману подію
    const alertCount = data.activeAlerts?.length || 0
    const alertTypes = data.activeAlerts?.map(a => a.type).join(", ") || "немає"
    
    console.log(
      `📢 Webhook: ${data.regionName} (${data.regionId}) - ` +
      `тривог: ${alertCount}, типи: ${alertTypes}`
    )

    // TODO: Тут можна додати логіку для:
    // - Збереження в базу даних
    // - Відправки push-сповіщень
    // - Оновлення кешу Redis тощо

    return NextResponse.json({ ok: true, received: data.regionId })
  } catch (error) {
    console.error("Webhook помилка:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// GET для перевірки, що endpoint працює
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Webhook endpoint is ready. Карта тривог в розробці.",
    timestamp: new Date().toISOString(),
  })
}
