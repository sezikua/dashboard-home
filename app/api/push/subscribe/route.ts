import { NextResponse } from "next/server"

// TODO: Реалізувати реальну логіку збереження підписок на пуш-повідомлення.
// Цей маршрут зараз лише повертає тестову відповідь.

export async function POST() {
  return NextResponse.json({ ok: true, message: "Mock subscribe endpoint (logica буде додана пізніше)" })
}
