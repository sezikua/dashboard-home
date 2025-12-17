"use client";

import { AlertTriangle } from "lucide-react";
import { UkraineMap } from "./ukraine-map";
import { ApiAlert } from "@/lib/alert-mapping";

interface AlertRegion {
  regionId: string
  regionName: string
  activeAlert: boolean
  notes?: string | null
  oblastStatus?: "full" | "partial" | "none"
}

interface AlertsWithMapProps {
  alerts: AlertRegion[]
  allAlertsForMap?: ApiAlert[] // Сирі дані з API для карти
  hasActiveAlert: boolean
  alertsHasData: boolean | null
}

export function AlertsWithMap({ alerts, allAlertsForMap, hasActiveAlert, alertsHasData }: AlertsWithMapProps) {
  // Використовуємо allAlertsForMap для карти, якщо він переданий, інакше alerts
  const alertsForMap = allAlertsForMap && allAlertsForMap.length > 0 ? allAlertsForMap : alerts

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle
          className={`w-6 h-6 ${hasActiveAlert ? "text-red-500" : "text-muted-foreground"}`}
        />
        <h2 className="text-xl font-semibold text-foreground">Повітряна тривога</h2>
      </div>

      {/* Карта тривог - зменшена на 15% */}
      {alertsHasData === false && (
        <p className="text-sm text-yellow-400 mb-2">
          Немає даних з сервера про тривоги. Перевірте підключення або спробуйте пізніше.
        </p>
      )}
      <div className="w-full h-[340px] lg:h-[425px] rounded-lg overflow-hidden bg-slate-900/40 border border-white/10">
        <UkraineMap alerts={alertsForMap} />
      </div>
    </div>
  )
}
