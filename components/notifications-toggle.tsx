"use client";

import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { getNotificationPermission, subscribeToPush } from "@/lib/push-client";

export function NotificationsToggle() {
  const [region, setRegion] = useState("kyiv");
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

    const result = await subscribeToPush(region.trim() || "kyiv");
    setStatus(result.message);
    setIsEnabling(false);
  };

  return (
    <div className="mt-3 p-3 rounded-lg bg-card/10 border border-border/40 text-xs flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {permission === "granted" ? (
            <Bell className="w-4 h-4 text-green-400" />
          ) : (
            <BellOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-semibold text-foreground text-xs">Сповіщення про тривоги та відключення</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-muted-foreground" htmlFor="region-input">
          Регіон (наприклад, kyiv, lviv):
        </label>
        <input
          id="region-input"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="flex-1 px-2 py-1 rounded border border-border/60 bg-background/60 text-xs"
        />
      </div>

      <button
        type="button"
        onClick={handleEnable}
        disabled={isEnabling}
        className="mt-1 inline-flex items-center justify-center px-3 py-1.5 rounded bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isEnabling ? "Увімкнення..." : "Увімкнути сповіщення"}
      </button>

      {status && <p className="text-[11px] text-muted-foreground mt-1">{status}</p>}

      <p className="text-[10px] text-muted-foreground/70 mt-1">
        На iOS / iPadOS сповіщення працюють лише, якщо сайт додано на головний екран як PWA
        (через "Add to Home Screen").
      </p>
    </div>
  );
}
