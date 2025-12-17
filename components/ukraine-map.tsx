"use client";

import { useEffect, useState } from "react";

interface AlertRegion {
  regionId: string
  regionName: string
  activeAlert: boolean
  notes?: string | null
  oblastStatus?: "full" | "partial" | "none"
}

// Мапінг між UID (regionId) та SVG id з ukraine.svg
const regionIdToSvgId: Record<string, string> = {
  "3": "UA-68", // Хмельницька
  "4": "UA-05", // Вінницька
  "5": "UA-56", // Рівненська
  "8": "UA-07", // Волинська
  "9": "UA-12", // Дніпропетровська
  "10": "UA-18", // Житомирська
  "11": "UA-21", // Закарпатська
  "12": "UA-23", // Запорізька
  "13": "UA-26", // Івано-Франківська
  "14": "UA-32", // Київська область
  "15": "UA-35", // Кіровоградська
  "16": "UA-09", // Луганська
  "17": "UA-48", // Миколаївська
  "18": "UA-51", // Одеська
  "19": "UA-53", // Полтавська
  "20": "UA-59", // Сумська
  "21": "UA-61", // Тернопільська
  "22": "UA-63", // Харківська
  "23": "UA-65", // Херсонська
  "24": "UA-71", // Черкаська
  "25": "UA-74", // Чернігівська
  "26": "UA-77", // Чернівецька
  "27": "UA-46", // Львівська
  "28": "UA-14", // Донецька
  "29": "UA-43", // АР Крим
  "30": "UA-40", // м. Севастополь
  "31": "UA-30", // м. Київ
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

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Завантаження карти...
      </div>
    )
  }

  // Створюємо Map з активними тривогами для швидкого пошуку
  const alertsByRegionId = new Map<string, boolean>()
  alerts.forEach((alert) => {
    alertsByRegionId.set(alert.regionId, alert.activeAlert)
  })

  // Обробляємо SVG: додаємо класи для підсвітки
  let processedSvg = svgContent

  // Для кожного регіону з мапінгу
  Object.entries(regionIdToSvgId).forEach(([regionId, svgId]) => {
    const hasAlert = alertsByRegionId.get(regionId) === true
    const regex = new RegExp(`id="${svgId}"([^>]*)>`, "g")

    processedSvg = processedSvg.replace(regex, (match, attrs) => {
      // Якщо є тривога - червоний колір, інакше - зелений
      const fillColor = hasAlert ? "#ef4444" : "#22c55e"
      const strokeColor = hasAlert ? "#dc2626" : "#16a34a"
      const opacity = hasAlert ? "0.9" : "0.6"

      // Перевіряємо, чи вже є style або fill
      if (attrs.includes("style=") || attrs.includes("fill=")) {
        // Замінюємо існуючі стилі
        let newAttrs = attrs
          .replace(/style="[^"]*"/g, "")
          .replace(/fill="[^"]*"/g, "")
          .replace(/stroke="[^"]*"/g, "")
          .replace(/opacity="[^"]*"/g, "")

        return `id="${svgId}"${newAttrs} style="fill: ${fillColor}; stroke: ${strokeColor}; stroke-width: 0.5; opacity: ${opacity}; transition: all 0.3s ease;">`
      } else {
        return `id="${svgId}"${attrs} style="fill: ${fillColor}; stroke: ${strokeColor}; stroke-width: 0.5; opacity: ${opacity}; transition: all 0.3s ease;">`
      }
    })
  })

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div
        className="w-full max-w-full h-auto"
        dangerouslySetInnerHTML={{ __html: processedSvg }}
        style={{
          filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))",
        }}
      />
    </div>
  )
}
