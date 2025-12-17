"use client";

import { regions, Region } from "./regions";

interface AlertRegion {
  regionId: string
  regionName: string
  activeAlert: boolean
  notes?: string | null
  oblastStatus?: "full" | "partial" | "none"
}

// Мапінг між id з масиву regions та regionId (UID) з API
// id з regions.ts -> regionId (UID) з API
const regionIdMap: Record<number, string> = {
  1: "4",   // Вінницька
  2: "8",   // Волинська
  3: "9",   // Дніпропетровська
  4: "28",  // Донецька
  5: "10",  // Житомирська
  6: "11",  // Закарпатська
  7: "12",  // Запорізька
  8: "13",  // Івано-Франківська
  9: "14",  // Київська
  10: "15", // Кіровоградська
  11: "16", // Луганська
  12: "27", // Львівська
  13: "17", // Миколаївська
  14: "18", // Одеська
  15: "19", // Полтавська
  16: "5",  // Рівненська
  17: "20", // Сумська
  18: "21", // Тернопільська
  19: "22", // Харківська
  20: "23", // Херсонська
  21: "3",  // Хмельницька
  22: "24", // Черкаська
  23: "26", // Чернівецька
  24: "25", // Чернігівська
  25: "29", // АР Крим
}

interface UkraineMapProps {
  alerts: AlertRegion[]
}

export function UkraineMap({ alerts }: UkraineMapProps) {

  // Створюємо Map з активними тривогами для швидкого пошуку
  const alertsByRegionId = new Map<string, boolean>()
  alerts.forEach((alert) => {
    alertsByRegionId.set(alert.regionId, alert.activeAlert)
  })


  // Генеруємо SVG path для кожної області
  const regionPaths = regions.map((region) => {
    const apiId = regionIdMap[region.id]
    const hasAlert = apiId ? alertsByRegionId.get(apiId) === true : false
    const fillColor = hasAlert ? "#ef4444" : "#22c55e"
    const strokeColor = hasAlert ? "#dc2626" : "#16a34a"
    const opacity = hasAlert ? "0.9" : "0.6"

    return (
      <path
        key={region.id}
        d={region.d}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1"
        opacity={opacity}
        style={{
          transition: "all 0.3s ease",
          cursor: "pointer",
        }}
      />
    )
  })

  // Додаємо підписи регіонів поверх карти
  const regionLabels = regions.map((region) => {
    const apiId = regionIdMap[region.id]
    const hasAlert = apiId ? alertsByRegionId.get(apiId) === true : false
    const textColor = hasAlert ? "#dc2626" : "#16a34a"
    const fontWeight = hasAlert ? "bold" : "normal"

    return (
      <text
        key={`label-${region.id}`}
        x={region.titleX}
        y={region.titleY}
        fontSize={region.fontSize}
        fill={textColor}
        fontWeight={fontWeight}
        textAnchor="middle"
        style={{
          pointerEvents: "none",
          userSelect: "none",
          transition: "all 0.3s ease",
        }}
      >
        {region.title}
      </text>
    )
  })

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg
        viewBox="0 0 1000 800"
        className="w-full h-auto"
        style={{
          filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))",
        }}
      >
        {regionPaths}
        {regionLabels}
      </svg>
    </div>
  )
}
