import { NextRequest, NextResponse } from "next/server"

const PUSH_SERVER_BASE = "https://push.kostrov.work"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, title, message, region = "kyiv" } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { ok: false, error: "Потрібні поля: type, title, message" },
        { status: 400 }
      )
    }

    // Валідація типу повідомлення
    const validTypes = ["blackout_30min", "blackout_change", "blackout_tomorrow"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { ok: false, error: `Невірний тип. Дозволені: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Відправляємо push на зовнішній сервер
    try {
      const res = await fetch(`${PUSH_SERVER_BASE}/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          title,
          body: message,
          region,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error(`Помилка відправки push: ${res.status}`, errorText)
        return NextResponse.json(
          {
            ok: false,
            error: `Помилка відправки push: ${res.status}`,
            details: errorText,
          },
          { status: res.status }
        )
      }

      const result = await res.json()
      return NextResponse.json({ ok: true, result })
    } catch (error) {
      console.error("Помилка при виклику push сервера:", error)
      return NextResponse.json(
        { ok: false, error: "Помилка при виклику push сервера" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Помилка обробки запиту:", error)
    return NextResponse.json(
      { ok: false, error: "Внутрішня помилка сервера" },
      { status: 500 }
    )
  }
}
