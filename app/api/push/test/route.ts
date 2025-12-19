import { NextResponse } from "next/server"

const PUSH_SERVER_BASE = "https://push.kostrov.work"

export async function POST() {
  const timestamp = new Date().toISOString()
  
  try {
    const res = await fetch(`${PUSH_SERVER_BASE}/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "blackout_30min",
        title: "🧪 Тестове сповіщення",
        body: `Тестова відправка о ${new Date().toLocaleTimeString("uk-UA", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Kiev",
        })} (Київ). Якщо ви бачите це повідомлення, push працює!`,
        region: "kyiv",
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json(
        {
          ok: false,
          error: `Помилка: ${res.status}`,
          details: errorText,
          timestamp,
        },
        { status: res.status }
      )
    }

    const result = await res.json()
    return NextResponse.json({
      ok: true,
      timestamp,
      serverResponse: result,
      message: "Тестове push-повідомлення відправлено",
    })
  } catch (error) {
    console.error("Помилка тестової відправки:", error)
    return NextResponse.json(
      {
        ok: false,
        error: "Помилка при виклику push сервера",
        timestamp,
      },
      { status: 500 }
    )
  }
}

