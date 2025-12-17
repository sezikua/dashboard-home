"use client";

import { useState } from "react";
import { AlertTriangle, Map } from "lucide-react";
import { UkraineMap } from "./ukraine-map";

interface AlertRegion {
  regionId: string
  regionName: string
  activeAlert: boolean
  notes?: string | null
  oblastStatus?: "full" | "partial" | "none"
}

interface AlertsWithMapProps {
  alerts: AlertRegion[]
  hasActiveAlert: boolean
  alertsHasData: boolean | null
}

export function AlertsWithMap({ alerts, hasActiveAlert, alertsHasData }: AlertsWithMapProps) {
  const [activeTab, setActiveTab] = useState<"list" | "map">("list")

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle
          className={`w-6 h-6 ${hasActiveAlert ? "text-red-500" : "text-muted-foreground"}`}
        />
        <h2 className="text-xl font-semibold text-foreground">Повітряна тривога</h2>
      </div>

      {/* Таби */}
      <div className="flex gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "list"
              ? "text-foreground border-b-2 border-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Список регіонів
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("map")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "map"
              ? "text-foreground border-b-2 border-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Map className="w-4 h-4" />
          Карта тривог
        </button>
      </div>

      {/* Контент табів */}
      {activeTab === "list" ? (
        <div className="space-y-3">
          {alertsHasData === false && (
            <p className="text-sm text-yellow-400">
              Немає даних з сервера про тривоги. Перевірте підключення або спробуйте пізніше.
            </p>
          )}

          {alertsHasData !== false &&
            alerts.map((alert) => (
              <div key={alert.regionId} className="p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">{alert.regionName}</span>
                  <span
                    className={`font-bold ${
                      alert.activeAlert ? "text-red-500 text-lg" : "text-green-500"
                    }`}
                  >
                    {alert.activeAlert ? "ТРИВОГА!" : "Немає тривоги"}
                  </span>
                </div>
                {/* Для Київської області додаємо розшифровку IoT-статусу, а потім notes */}
                {alert.regionId === "14" && alert.oblastStatus && (
                  <p className="mt-2 text-xs text-muted-foreground leading-snug">
                    {alert.oblastStatus === "full" &&
                      "Статус області: повітряна тривога по всій Київській області."}
                    {alert.oblastStatus === "partial" &&
                      "Статус області: часткова тривога в окремих районах / громадах Київської області."}
                  </p>
                )}
                {alert.notes && (
                  <p className="mt-2 text-xs text-muted-foreground leading-snug">
                    {alert.notes}
                  </p>
                )}
              </div>
            ))}
        </div>
      ) : (
        <div className="w-full h-[400px] lg:h-[500px] rounded-lg overflow-hidden bg-slate-900/40 border border-white/10">
          <UkraineMap alerts={alerts} />
        </div>
      )}
    </div>
  )
}
