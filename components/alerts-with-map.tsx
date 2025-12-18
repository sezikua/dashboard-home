"use client";

import { AlertTriangle } from "lucide-react";
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
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle
          className={`w-6 h-6 ${hasActiveAlert ? "text-red-500" : "text-muted-foreground"}`}
        />
        <h2 className="text-xl font-semibold text-foreground">Повітряна тривога</h2>
      </div>

      {/* Карта відображається завжди */}
      <div className="flex-1 min-h-[250px] lg:min-h-[300px] rounded-lg overflow-hidden">
        <UkraineMap alerts={alerts} />
      </div>

      {/* Попередження якщо немає даних */}
      {alertsHasData === false && (
        <p className="text-xs text-yellow-400 mt-2">
          Немає даних з сервера. Оновлення...
        </p>
      )}
    </div>
  )
}
