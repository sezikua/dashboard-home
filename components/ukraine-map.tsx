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
// id з regions.ts -> regionId (UID) з API ukrainealarm.com
const regionIdMap: Record<number, string> = {
  1: "4",   // Вінницька область
  2: "8",   // Волинська область
  3: "9",   // Дніпропетровська область
  4: "28",  // Донецька область
  5: "10",  // Житомирська область
  6: "11",  // Закарпатська область
  7: "12",  // Запорізька область
  8: "13",  // Івано-Франківська область
  9: "14",  // Київська область
  10: "15", // Кіровоградська область
  11: "16", // Луганська область
  12: "27", // Львівська область
  13: "17", // Миколаївська область
  14: "18", // Одеська область
  15: "19", // Полтавська область
  16: "5",  // Рівненська область
  17: "20", // Сумська область
  18: "21", // Тернопільська область
  19: "22", // Харківська область
  20: "23", // Херсонська область
  21: "3",  // Хмельницька область
  22: "24", // Черкаська область
  23: "26", // Чернівецька область
  24: "25", // Чернігівська область
  25: "31", // м. Київ
  26: "29", // АР Крим
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
