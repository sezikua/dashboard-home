"use client";

import { regions } from "./regions";
import { getRegionsWithStatus, ApiAlert } from "@/lib/alert-mapping";

interface UkraineMapProps {
  alerts: ApiAlert[] // Сирі дані з API
}

export function UkraineMap({ alerts }: UkraineMapProps) {
  // Фільтруємо регіони, але залишаємо Крим (id 26) навіть якщо він disabled
  const activeRegions = regions.filter((region: any) => !region.disabled || region.id === 26);
  
  // Отримуємо регіони зі статусом тривог
  const regionsWithStatus = getRegionsWithStatus(alerts, activeRegions);
  
  // Додаємо логування для дебагу (тільки в development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Alerts from API:', alerts);
    console.log('Regions with status:', regionsWithStatus.filter(r => r.isAlert));
  }

  // Генеруємо SVG path для кожної області
  const regionPaths = regionsWithStatus.map((region) => {
    const hasAlert = region.isAlert;
    // RGB(26, 35, 50) для областей без тривоги, RGB(108, 39, 44) для тривоги
    const fillColor = hasAlert ? "#6c272c" : "#1a2332" // RGB(108, 39, 44) : RGB(26, 35, 50)
    const strokeColor = hasAlert ? "#5a1f23" : "#141923" // Трохи темніша обводка
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
  const regionLabels = regionsWithStatus.map((region) => {
    const hasAlert = region.isAlert;
    // Колір тексту: світліший для тривоги, світлий для нормального стану (щоб було видно на темному фоні)
    const textColor = hasAlert ? "#ff6b6b" : "#e2e8f0" // Світлий для видимості на темному фоні
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
