"use client";

import { regions } from "./regions";

interface AlertRegion {
  regionId: string
  regionName: string
  activeAlert: boolean
  alertType?: string
  alertTypeName?: string
  startedAt?: string
  lastUpdate?: string
  notes?: string | null
  oblastStatus?: "full" | "partial" | "none"
}

// Мапінг між id з масиву regions (1-26) та regionId з API ukrainealarm.com
// Ключ: id з regions.ts, Значення: regionId з API
const regionIdMap: Record<number, string> = {
  1: "4",   // Вінницька область
  2: "8",   // Волинська область
  3: "9",   // Дніпропетровська область
  4: "11",  // Донецька область (в API є також 28)
  5: "10",  // Житомирська область
  6: "7",   // Закарпатська область
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
  oblastsWithAlerts?: string[]
}

export function UkraineMap({ alerts, oblastsWithAlerts = [] }: UkraineMapProps) {
  // Створюємо Set з активними тривогами для швидкого пошуку
  const alertsSet = new Set<string>()
  
  // Додаємо з масиву alerts
  alerts.forEach((alert) => {
    if (alert.activeAlert) {
      alertsSet.add(alert.regionId)
    }
  })
  
  // Додаємо з масиву oblastsWithAlerts
  oblastsWithAlerts.forEach((id) => {
    alertsSet.add(id)
  })

  // Також додаємо альтернативні ID для деяких областей
  // Донецька область має два ID: 11 і 28
  if (alertsSet.has("11") || alertsSet.has("28")) {
    alertsSet.add("11")
    alertsSet.add("28")
  }

  // Генеруємо SVG path для кожної області
  const regionPaths = regions.map((region) => {
    const apiId = regionIdMap[region.id]
    const hasAlert = apiId ? alertsSet.has(apiId) : false
    
    // Кольори: немає тривоги - темно-синій, є тривога - темно-червоний з анімацією
    const fillColor = hasAlert ? "#7a1f2d" : "#16202C"
    const strokeColor = hasAlert ? "#c53030" : "#2a3a4d"
    const opacity = hasAlert ? "1" : "0.9"

    return (
      <path
        key={region.id}
        d={region.d}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1"
        opacity={opacity}
        className={hasAlert ? "animate-pulse" : ""}
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
    const hasAlert = apiId ? alertsSet.has(apiId) : false
    
    // Кольори тексту: світліші версії основних кольорів для читабельності
    const textColor = hasAlert ? "#ff6b7a" : "#8ba3c0"
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

  // Рахуємо кількість областей з тривогами
  let alertCount = 0
  regions.forEach((region) => {
    const apiId = regionIdMap[region.id]
    if (apiId && alertsSet.has(apiId)) {
      alertCount++
    }
  })

  return (
    <div className="w-full h-full flex flex-col items-center overflow-hidden">
      {/* Статистика */}
      <div className="flex gap-3 text-[10px] md:text-xs shrink-0 pb-1">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
          <span className="text-red-400 font-medium">{alertCount} з тривогою</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
          <span className="text-gray-400">{regions.length - alertCount} без тривоги</span>
        </div>
      </div>
      
      {/* Карта - масштабується до контейнера */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center">
        <svg
          viewBox="0 0 1000 680"
          className="w-full h-auto max-h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{
            filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))",
          }}
        >
          {regionPaths}
          {regionLabels}
        </svg>
      </div>
    </div>
  )
}
