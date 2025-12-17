"use client";

import { useEffect, useState } from "react";
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
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [svgElement, setSvgElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    fetch("/ukraine.svg")
      .then((res) => res.text())
      .then((text) => {
        setSvgContent(text)
        // Створюємо тимчасовий елемент для парсингу SVG
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(text, "image/svg+xml")
        const svg = svgDoc.querySelector("svg")
        if (svg) {
          setSvgElement(svg as unknown as HTMLElement)
        }
      })
      .catch((err) => {
        console.error("Помилка завантаження карти:", err)
      })
  }, [])

  // Створюємо Map з активними тривогами для швидкого пошуку
  const alertsByRegionId = new Map<string, boolean>()
  alerts.forEach((alert) => {
    alertsByRegionId.set(alert.regionId, alert.activeAlert)
  })

  // Обробляємо SVG через DOM після завантаження
  useEffect(() => {
    if (!svgElement) return

    // Для кожного регіону знаходимо відповідні елементи в SVG та підсвічуємо їх
    regions.forEach((region) => {
      const apiId = regionIdMap[region.id]
      if (!apiId) return

      const hasAlert = alertsByRegionId.get(apiId) === true
      const fillColor = hasAlert ? "#ef4444" : "#22c55e"
      const strokeColor = hasAlert ? "#dc2626" : "#16a34a"
      const opacity = hasAlert ? "0.9" : "0.6"

      // Шукаємо елементи за різними критеріями
      const possibleIds = [
        `UA-${String(region.id).padStart(2, "0")}`,
        `region-${region.id}`,
        region.title.toLowerCase().replace(/\s+/g, "-"),
        region.title.toLowerCase().replace(/\s+/g, ""),
      ]

      possibleIds.forEach((id) => {
        const element = svgElement.querySelector(`#${id}`) as SVGElement | null
        if (element) {
          element.setAttribute("fill", fillColor)
          element.setAttribute("stroke", strokeColor)
          element.setAttribute("stroke-width", "1")
          element.setAttribute("opacity", opacity)
          element.style.transition = "all 0.3s ease"
        }
      })

      // Також шукаємо за title атрибутом
      const allElements = svgElement.querySelectorAll("path, polygon, g, circle, ellipse, rect")
      allElements.forEach((el) => {
        const title = el.getAttribute("title") || el.getAttribute("data-name") || ""
        if (title.toLowerCase().includes(region.title.toLowerCase())) {
          const svgEl = el as SVGElement
          svgEl.setAttribute("fill", fillColor)
          svgEl.setAttribute("stroke", strokeColor)
          svgEl.setAttribute("stroke-width", "1")
          svgEl.setAttribute("opacity", opacity)
          svgEl.style.transition = "all 0.3s ease"
        }
      })
    })
  }, [svgElement, alerts])

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Завантаження карти...
      </div>
    )
  }


  // Додаємо підписи регіонів поверх карти
  const regionLabels = regions.map((region) => {
    const apiId = regionIdMap[region.id]
    const hasAlert = apiId ? alertsByRegionId.get(apiId) === true : false
    const textColor = hasAlert ? "#dc2626" : "#16a34a"
    const fontWeight = hasAlert ? "bold" : "normal"

    return (
      <text
        key={region.id}
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
      <div className="relative w-full max-w-full h-auto">
        <div
          className="w-full h-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{
            filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))",
          }}
        />
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 800"
          preserveAspectRatio="xMidYMid meet"
        >
          {regionLabels}
        </svg>
      </div>
    </div>
  )
}
