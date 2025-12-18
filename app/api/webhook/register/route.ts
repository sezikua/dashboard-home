import { NextResponse } from "next/server"

// Endpoint для реєстрації webhook в ukrainealarm.com API
// Викликається один раз для налаштування

export async function POST() {
  const apiKey = process.env.UKRAINE_ALARM_API_KEY
  const webhookUrl = process.env.WEBHOOK_URL || `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/alerts`

  if (!apiKey) {
    return NextResponse.json(
      { error: "UKRAINE_ALARM_API_KEY не налаштовано" },
      { status: 500 }
    )
  }

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "WEBHOOK_URL або NEXT_PUBLIC_BASE_URL не налаштовано" },
      { status: 500 }
    )
  }

  try {
    const response = await fetch("https://api.ukrainealarm.com/api/v3/webhook", {
      method: "POST",
      headers: {
        accept: "text/plain",
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webHookUrl: webhookUrl,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Помилка реєстрації webhook: ${response.status}`, errorText)
      return NextResponse.json(
        {
          error: `Помилка реєстрації: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      )
    }

    const result = await response.text()
    console.log("Webhook зареєстровано успішно:", result)

    return NextResponse.json({
      ok: true,
      message: "Webhook зареєстровано успішно",
      webhookUrl,
      response: result,
    })
  } catch (error) {
    console.error("Помилка при реєстрації webhook:", error)
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 }
    )
  }
}

// GET для перевірки статусу
export async function GET() {
  const webhookUrl = process.env.WEBHOOK_URL || `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/alerts`
  
  return NextResponse.json({
    status: "ready",
    webhookUrl: webhookUrl || "Не налаштовано",
    hasApiKey: !!process.env.UKRAINE_ALARM_API_KEY,
    instructions: "POST на цей endpoint для реєстрації webhook",
  })
}
