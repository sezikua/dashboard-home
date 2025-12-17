"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push-client";

// Невеликий компонент, який один раз реєструє service worker при завантаженні застосунку.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
