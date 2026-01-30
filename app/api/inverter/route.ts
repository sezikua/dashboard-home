import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

const INVERTER_API_BASE = "http://173.212.215.18:8080"

function getInverterToken(): string | null {
  const fromEnv = process.env.INVERTER_API_TOKEN
  if (fromEnv?.trim()) return fromEnv.trim()

  try {
    const tokenPath = join(process.cwd(), "token-inverter.txt")
    const token = readFileSync(tokenPath, "utf-8").trim()
    return token || null
  } catch {
    return null
  }
}

export interface InverterDataPayload {
  exhibitionTime?: string
  states?: string
  acVoltage?: number
  acFrequency?: number
  outputVoltage?: number
  outputFrequency?: number
  loadPower?: number
  batteryVoltage?: number
  batteryCurrent?: number
  batteryPower?: number
  capacityPercentage?: number
  lastUpdate?: string
  powerId?: number
  inverterId?: number
}

export async function GET() {
  const token = getInverterToken()
  if (!token) {
    return NextResponse.json(
      { status: "error", error: "INVERTER_API_TOKEN не налаштовано. Локально: створіть token-inverter.txt з токеном. На Vercel: додайте змінну середовища INVERTER_API_TOKEN." },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${INVERTER_API_BASE}/api/inverter`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { status: "error", error: `API інвертора: ${res.status}`, details: text },
        { status: res.status === 401 ? 401 : 502 }
      )
    }

    const json = await res.json()
    if (json.status !== "success" || !json.data) {
      return NextResponse.json(
        { status: "error", error: "Невірна відповідь API інвертора", raw: json },
        { status: 502 }
      )
    }

    const data = json.data as Record<string, unknown>
    const { inverterName, collectorName, ...rest } = data
    void inverterName
    void collectorName

    return NextResponse.json({
      status: "success",
      timestamp: json.timestamp,
      data: rest as InverterDataPayload,
    })
  } catch (err) {
    console.error("Inverter API error:", err)
    return NextResponse.json(
      { status: "error", error: String(err instanceof Error ? err.message : err) },
      { status: 502 }
    )
  }
}
