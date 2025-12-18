import { NextResponse } from "next/server"

// Тимчасовий endpoint - дані будуть надходити через WebHook
// WebHook endpoint: /api/webhook/alerts

export async function GET() {
  return NextResponse.json({
    ok: false,
    alerts: [],
    message: "Карта тривог в розробці. Дані надходитимуть через WebHook.",
  })
}
