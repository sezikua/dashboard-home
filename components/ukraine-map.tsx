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

  useEffect(() => {
    fetch("/ukraine.svg")
      .then((res) => res.text())
      .then((text) => setSvgContent(text))
      .catch((err) => {
        console.error("Помилка завантаження карти:", err)
      })
  }, [])

  // Створюємо Map з активними тривогами для швидкого пошуку
  const alertsByRegionId = new Map<string, boolean>()
  alerts.forEach((alert) => {
    alertsByRegionId.set(alert.regionId, alert.activeAlert)
  })

  // Створюємо Map для швидкого пошуку регіону за regionId
  const regionByApiId = new Map<string, Region>()
  regions.forEach((region) => {
    const apiId = regionIdMap[region.id]
    if (apiId) {
      regionByApiId.set(apiId, region)
    }
  })

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Завантаження карти...
      </div>
    )
  }

  // Обробляємо SVG: додаємо класи для підсвітки областей
  let processedSvg = svgContent

  // Мапінг назв регіонів до можливих id в SVG (різні варіанти написання)
  const regionNameToSvgIds: Record<string, string[]> = {
    "Вінницька": ["vinnytsya", "vinnytsia", "UA-05", "region-1"],
    "Волинська": ["volyn", "UA-07", "region-2"],
    "Дніпропетровська": ["dnipropetrovsk", "UA-12", "region-3"],
    "Донецька": ["donetsk", "UA-14", "region-4"],
    "Житомирська": ["zhytomyr", "UA-18", "region-5"],
    "Закарпатська": ["transcarpathia", "zakarpattia", "UA-21", "region-6"],
    "Запорізька": ["zaporizhzhya", "UA-23", "region-7"],
    "Івано-Франківська": ["ivano-frankivsk", "UA-26", "region-8"],
    "Київська": ["kiev", "kyiv", "UA-32", "region-9"],
    "Кіровоградська": ["kirovohrad", "UA-35", "region-10"],
    "Луганська": ["luhansk", "UA-09", "region-11"],
    "Львівська": ["lviv", "UA-46", "region-12"],
    "Миколаївська": ["mykolayiv", "UA-48", "region-13"],
    "Одеська": ["odessa", "UA-51", "region-14"],
    "Полтавська": ["poltava", "UA-53", "region-15"],
    "Рівненська": ["rivne", "UA-56", "region-16"],
    "Сумська": ["sumy", "UA-59", "region-17"],
    "Тернопільська": ["ternopil", "UA-61", "region-18"],
    "Харківська": ["kharkiv", "UA-63", "region-19"],
    "Херсонська": ["kherson", "UA-65", "region-20"],
    "Хмельницька": ["khmelnytskyy", "UA-68", "region-21"],
    "Черкаська": ["cherkasy", "UA-71", "region-22"],
    "Чернівецька": ["chernivtsi", "UA-77", "region-23"],
    "Чернігівська": ["chernihiv", "UA-74", "region-24"],
    "АР Крим": ["crimea", "UA-43", "region-25"],
  }

  // Для кожного регіону з мапінгу
  Object.entries(regionIdMap).forEach(([regionIdFromArray, apiRegionId]) => {
    const hasAlert = alertsByRegionId.get(apiRegionId) === true
    const region = regions.find((r) => r.id === Number(regionIdFromArray))
    
    if (!region) return

    // Якщо є тривога - червоний колір, інакше - зелений
    const fillColor = hasAlert ? "#ef4444" : "#22c55e"
    const strokeColor = hasAlert ? "#dc2626" : "#16a34a"
    const opacity = hasAlert ? "0.9" : "0.6"
    const styleStr = `fill: ${fillColor}; stroke: ${strokeColor}; stroke-width: 1; opacity: ${opacity}; transition: all 0.3s ease;`

    // Отримуємо можливі id для цього регіону
    const possibleIds = regionNameToSvgIds[region.title] || []
    
    // Шукаємо елементи за id
    possibleIds.forEach((svgId) => {
      // Шукаємо всі елементи з цим id
      const idRegex = new RegExp(`id=["']${svgId}["']([^>]*)>`, "gi")
      processedSvg = processedSvg.replace(idRegex, (match, attrs) => {
        // Замінюємо або додаємо style
        if (attrs.includes("style=")) {
          return match.replace(/style="[^"]*"/, `style="${styleStr}"`)
        } else {
          return match.replace(/>$/, ` style="${styleStr}">`)
        }
      })
    })

    // Також шукаємо за назвою в title атрибуті
    const titleRegex = new RegExp(`title=["']([^"']*${region.title}[^"']*)["']`, "i")
    processedSvg = processedSvg.replace(
      /(<path|<polygon|<g)([^>]*title=["'][^"']*)/gi,
      (match, tag, attrs) => {
        if (titleRegex.test(attrs)) {
          if (attrs.includes("style=")) {
            return match.replace(/style="[^"]*"/, `style="${styleStr}"`)
          } else {
            return `${tag}${attrs} style="${styleStr}">`
          }
        }
        return match
      }
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
          dangerouslySetInnerHTML={{ __html: processedSvg }}
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
