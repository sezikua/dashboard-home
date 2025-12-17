"use client";

// Допоміжні функції для підготовки Web Push з клієнтського боку.
// Тут немає реальної логіки підписок або надсилання пушів.

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Регіструємо service worker лише на HTTPS або localhost
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const isSecure = window.location.protocol === "https:";

  if (!isSecure && !isLocalhost) return;

  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      console.log("Service worker зареєстровано:", registration.scope);
    })
    .catch((error) => {
      console.error("Помилка реєстрації service worker:", error);
    });
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined") return;

  if (!("Notification" in window)) {
    console.warn("Браузер не підтримує Notification API");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("Статус дозволу на нотифікації:", permission);
  } catch (error) {
    console.error("Помилка під час запиту дозволу на нотифікації:", error);
  }
}

// Підготовка до використання VAPID-ключа у майбутньому.
// Реальне використання буде додано пізніше.
export function getVapidPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}
