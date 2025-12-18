import { NextResponse } from "next/server"
import {
  updateAllRegions,
  updateOblastString,
  getAlerts,
  getOblastString,
  hasData,
  needsPolling,
  RegionAlert,
} from "@/lib/alerts-store"

// TTL для polling (30 секунд)
const CACHE_TTL_MS = 30_000

export async function GET() {
  // Якщо потрібно оновити через polling (webhook не оновлював недавно)
  if (needsPolling(CACHE_TTL_MS)) {
    try {
      const [regionsRes, oblastRes] = await Promise.all([
        fetch("https://api.ukrainealarm.com/api/v3/regions", {
          headers: {
            accept: "application/json",
            Authorization: process.env.UKRAINE_ALARM_API_KEY || "",
          },
          cache: "no-store",
        }),
        fetch("https://api.ukrainealarm.com/api/v1/iot/active_air_raid_alerts_by_oblast.json", {
          cache: "no-store",
        }),
      ])

      if (!regionsRes.ok) {
        console.warn(`API регіонів повернуло статус: ${regionsRes.status}`)
      } else {
        const data: RegionAlert[] = await regionsRes.json()
        if (Array.isArray(data)) {
          updateAllRegions(data)
        }
      }

      if (!oblastRes.ok) {
        console.warn(`API IoT тривог повернуло статус: ${oblastRes.status}`)
      } else {
        const text = await oblastRes.text()
        updateOblastString(text.replace(/"/g, "").trim())
      }
    } catch (error) {
      console.error("Помилка API тривог:", error)
    }
  }

  return NextResponse.json({
    ok: hasData(),
    alerts: getAlerts(),
    oblastString: getOblastString(),
  })
}
