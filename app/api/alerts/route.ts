import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("https://api.ukrainealarm.com/api/v3/alerts", {
      headers: {
        Authorization: "ec5c9b31:4229c29d4766421d7d8500a5d03c1947",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`API повернуло статус: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Помилка API тривог:", error)
    return NextResponse.json({ error: "Не вдалося отримати дані про тривоги" }, { status: 500 })
  }
}
