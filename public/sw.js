self.addEventListener("install", (event) => {
  console.log("[sw] install event")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[sw] activate event")
  self.clients.claim()
})

/**
 * Обробка push-подій від бекенда.
 * Очікується payload формату:
 * {
 *   type: "blackout_30min" | "blackout_change" | "blackout_tomorrow",
 *   title: string,
 *   body: string,
 *   region: string
 * }
 */
self.addEventListener("push", (event) => {
  console.log("[sw] push event received")

  if (!event.data) {
    console.warn("[sw] push event без даних")
    return
  }

  let payload
  try {
    payload = event.data.json()
  } catch (e) {
    console.error("[sw] Неможливо розпарсити payload як JSON", e)
    return
  }

  const { title, body, type, region } = payload

  const options = {
    body: body || "",
    icon: "/genfavicon-180.png", // іконка для нотифікації
    badge: "/genfavicon-32.png",
    data: {
      url: `https://alarm.kostrov.work/?type=${encodeURIComponent(type || "")}&region=${encodeURIComponent(region || "")}`,
      type,
      region,
    },
  }

  event.waitUntil(self.registration.showNotification(title || "Сповіщення", options))
})

self.addEventListener("notificationclick", (event) => {
  console.log("[sw] notification click", event.notification && event.notification.data)

  event.notification.close()

  const targetUrl =
    (event.notification && event.notification.data && event.notification.data.url) ||
    "https://alarm.kostrov.work/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
