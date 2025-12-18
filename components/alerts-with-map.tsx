"use client";

import { AlertTriangle } from "lucide-react";
import { UkraineMap } from "./ukraine-map";

interface AlertRegion {
  regionId: string
  regionName: string
  activeAlert: boolean
}

interface AlertsWithMapProps {
  alerts: AlertRegion[]
  hasActiveAlert: boolean
}

export function AlertsWithMap({ alerts, hasActiveAlert }: AlertsWithMapProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle
          className={`w-6 h-6 ${hasActiveAlert ? "text-red-500" : "text-muted-foreground"}`}
        />
        <h2 className="text-xl font-semibold text-foreground">Повітряна тривога</h2>
      </div>

      {/* Карта */}
      <div className="flex-1 min-h-[250px] lg:min-h-[300px] rounded-lg overflow-hidden">
        <UkraineMap alerts={alerts} />
      </div>

      {/* Повідомлення про розробку */}
      <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
        Карта тривог в розробці
      </p>
    </div>
  )
}
