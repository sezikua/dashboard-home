"use client";

// Допоміжні функції для Web Push з клієнтського боку.

const PUSH_SERVER_BASE = "https://push.kostrov.work";

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
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

export function getVapidPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

export async function getNotificationPermission(): Promise<PushPermissionState> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermissionState;
}

export async function requestNotificationPermission(): Promise<PushPermissionState> {
  if (typeof window === "undefined") return "unsupported";

  if (!("Notification" in window)) {
    console.warn("Браузер не підтримує Notification API");
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("Статус дозволу на нотифікації:", permission);
    return permission as PushPermissionState;
  } catch (error) {
    console.error("Помилка під час запиту дозволу на нотифікації:", error);
    return "unsupported";
  }
}

export async function subscribeToPush(region: string): Promise<{ ok: boolean; message: string }>{
  if (typeof window === "undefined") {
    return { ok: false, message: "Клієнтське середовище недоступне" };
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, message: "Push / Notification / ServiceWorker не підтримуються браузером" };
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Дозвіл на сповіщення не надано" };
  }

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY не налаштовано");
    return { ok: false, message: "VAPID ключ не налаштовано" };
  }

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.ready;
  } catch (error) {
    console.error("Service worker не готовий:", error);
    return { ok: false, message: "Service worker не готовий" };
  }

  let subscription: PushSubscription | null = null;

  try {
    subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
  } catch (error) {
    console.error("Помилка підписки на push:", error);
    return { ok: false, message: "Не вдалося підписатися на push" };
  }

  const subscriptionJson = subscription.toJSON();

  const body = {
    subscription: {
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
      },
    },
    region,
  };

  try {
    const res = await fetch(`${PUSH_SERVER_BASE}/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("Помилка бекенду під час /push/subscribe:", res.status, await res.text());
      return { ok: false, message: "Бекенд відхилив підписку" };
    }

    console.log("Підписку на push успішно відправлено на бекенд");
    return { ok: true, message: "Сповіщення увімкнено" };
  } catch (error) {
    console.error("Помилка мережі під час /push/subscribe:", error);
    return { ok: false, message: "Помилка мережі під час надсилання підписки" };
  }
}
