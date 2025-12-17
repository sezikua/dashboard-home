import { NextResponse } from "next/server"

// TODO: Реалізувати реальну логіку надсилання пуш-повідомлень.
// Зараз маршрут лише повертає заглушку.

export async function POST() {
  return NextResponse.json({ ok: true, message: "Mock send endpoint (логіка буде додана пізніше)" })
}
