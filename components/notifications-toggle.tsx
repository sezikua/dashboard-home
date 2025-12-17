"use client";

import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { getNotificationPermission, subscribeToPush } from "@/lib/push-client";

export function NotificationsToggle() {
  const [status, setStatus] = useState<string>("");
  const [isEnabling, setIsEnabling] = useState(false);
  const [permission, setPermission] = useState<string | null>(null);

  const handleEnable = async () => {
    setIsEnabling(true);
    setStatus("");

    const currentPerm = await getNotificationPermission();
    setPermission(currentPerm);

    if (currentPerm === "denied") {
      setStatus("Сповіщення заблоковані в налаштуваннях браузера");
      setIsEnabling(false);
      return;
    }

    // Дашборд працює лише для одного регіону — kyiv
    const result = await subscribeToPush("kyiv");
    setStatus(result.message);
    setIsEnabling(false);
  };

  return (
    <div className="mt-3 w-full max-w-sm mx-auto text-[11px] text-muted-foreground/80 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 justify-center">
        {permission === "granted" ? (
          <Bell className="w-3 h-3 text-green-400" />
        ) : (
          <BellOff className="w-3 h-3 text-muted-foreground/70" />
        )}
        <span className="font-medium text-[11px]">
          Сповіщення про тривоги та відключення
        </span>
      </div>

      <button
        type="button"
        onClick={handleEnable}
        disabled={isEnabling}
        className="mx-auto mt-1 inline-flex items-center justify-center px-3 py-1.5 rounded border border-border/40 bg-background/40 text-[11px] font-semibold text-muted-foreground hover:bg-background/70 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isEnabling ? "Увімкнення..." : "Увімкнути сповіщення"}
      </button>

      {status && <p className="text-[10px] text-muted-foreground mt-1 text-center">{status}</p>}

      <p className="text-[9px] text-muted-foreground/60 mt-1 text-center max-w-xs mx-auto">
        На iOS / iPadOS сповіщення працюють лише, якщо сайт додано на головний екран як PWA
        (через «Add to Home Screen»).
      </p>
    </div>
  );
}

