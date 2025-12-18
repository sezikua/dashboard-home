import { NextRequest, NextResponse } from "next/server"
import { updateRegionAlert, RegionAlert } from "@/lib/alerts-store"

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
    const data: RegionAlert = await request.json()

    // Валідація даних
    if (!data.regionId || !data.regionName) {
      console.warn("Webhook: невалідні дані", data)
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    // Оновлюємо кеш
    updateRegionAlert(data)

    console.log(
      `Webhook: оновлено регіон ${data.regionName} (${data.regionId}), ` +
      `тривог: ${data.activeAlerts?.length || 0}`
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook помилка:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// GET для перевірки, що endpoint працює
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Webhook endpoint is ready",
    timestamp: new Date().toISOString(),
  })
}
