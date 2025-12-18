import { NextResponse } from "next/server"

// Інтерфейси для API відповіді
interface AlertInfo {
  regionId: string
  regionType: string
  type: string
  lastUpdate: string
  startedAt?: string
}

interface RegionData {
  regionId: string
  regionType: string
  regionName: string
  regionEngName?: string
  lastUpdate: string
  activeAlerts: AlertInfo[]
}

// Маппінг районів до областей (для підсвічування області при тривозі в районі)
const DISTRICT_TO_OBLAST: Record<string, string> = {
  // Харківська область (22)
  "124": "22", "122": "22", "123": "22", "125": "22", "126": "22", "127": "22", "128": "22",
  // Запорізька область (12)
  "145": "12", "146": "12", "147": "12", "148": "12", "149": "12",
  // Донецька область (11)  
  "49": "11", "50": "11", "51": "11", "52": "11", "53": "11", "54": "11", "55": "11", "56": "11",
  // Луганська область (16)
  "84": "16", "85": "16", "86": "16", "87": "16",
  // Херсонська область (23)
  "129": "23", "130": "23", "131": "23", "132": "23", "133": "23",
  // Дніпропетровська область (9)
  "42": "9", "43": "9", "44": "9", "45": "9", "46": "9", "47": "9", "48": "9",
  // Сумська область (20)
  "114": "20", "115": "20", "116": "20", "117": "20", "118": "20",
  // Чернігівська область (25)
  "140": "25", "141": "25", "142": "25", "143": "25", "144": "25",
  // Одеська область (18)
  "99": "18", "100": "18", "101": "18", "102": "18", "103": "18", "104": "18", "105": "18",
  // Миколаївська область (17)
  "95": "17", "96": "17", "97": "17", "98": "17",
  // Київська область (14)
  "73": "14", "74": "14", "75": "14", "76": "14", "77": "14", "78": "14", "79": "14",
  // Полтавська область (19)
  "106": "19", "107": "19", "108": "19", "109": "19",
}

// Мапінг regionId API до назв областей
const REGION_ID_TO_NAME: Record<string, string> = {
  "3": "Хмельницька область",
  "4": "Вінницька область",
  "5": "Рівненська область",
  "7": "Закарпатська область",
  "8": "Волинська область",
  "9": "Дніпропетровська область",
  "10": "Житомирська область",
  "11": "Донецька область",
  "12": "Запорізька область",
  "13": "Івано-Франківська область",
  "14": "Київська область",
  "15": "Кіровоградська область",
  "16": "Луганська область",
  "17": "Миколаївська область",
  "18": "Одеська область",
  "19": "Полтавська область",
  "20": "Сумська область",
  "21": "Тернопільська область",
  "22": "Харківська область",
  "23": "Херсонська область",
  "24": "Черкаська область",
  "25": "Чернігівська область",
  "26": "Чернівецька область",
  "27": "Львівська область",
  "28": "Донецька область", // Альтернативний ID
  "29": "АР Крим",
  "30": "м. Севастополь",
  "31": "м. Київ",
}

// Список regionId областей (без районів та громад)
const OBLAST_IDS = [
  "3", "4", "5", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16",
  "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28",
  "29", "30", "31"
]

// Типи тривог
const ALERT_TYPES: Record<string, { name: string; icon: string; color: string }> = {
  'AIR': { name: 'Повітряна тривога', icon: '🚨', color: '#e74c3c' },
  'ARTILLERY': { name: 'Артилерійський обстріл', icon: '💥', color: '#e67e22' },
  'URBAN_FIGHTS': { name: 'Вуличні бої', icon: '⚔️', color: '#9b59b6' },
  'CHEMICAL': { name: 'Хімічна загроза', icon: '☢️', color: '#f1c40f' },
  'NUCLEAR': { name: 'Ядерна загроза', icon: '☢️', color: '#e74c3c' },
  'INFO': { name: 'Інформаційна тривога', icon: 'ℹ️', color: '#3498db' },
  'UNKNOWN': { name: 'Невідома загроза', icon: '⚠️', color: '#95a5a6' }
}

export async function GET() {
  const apiKey = process.env.UKRAINE_ALARM_API_KEY

  // Перевірка API ключа
  if (!apiKey) {
    console.error("UKRAINE_ALARM_API_KEY не налаштовано!")
    return NextResponse.json({
      ok: false,
      alerts: [],
      detailedAlerts: [],
      oblastsWithAlerts: [],
      oblastString: null,
      error: "API ключ не налаштовано",
    })
  }

  try {
    // Запит до API тривог (а не регіонів)
    const alertsRes = await fetch("https://api.ukrainealarm.com/api/v3/alerts", {
      method: "GET",
      headers: {
        "accept": "application/json",
        "Authorization": apiKey,
      },
      next: { revalidate: 30 }, // Кешування на 30 секунд
    })

    if (!alertsRes.ok) {
      const errorText = await alertsRes.text()
      console.error(`API тривог повернуло статус: ${alertsRes.status}`, errorText)
      return NextResponse.json({
        ok: false,
        alerts: [],
        detailedAlerts: [],
        oblastsWithAlerts: [],
        oblastString: null,
        error: `API помилка: ${alertsRes.status}`,
      })
    }

    const rawData = await alertsRes.json()
    
    // API повертає масив регіонів з активними тривогами
    let data: RegionData[] = []
    
    if (Array.isArray(rawData)) {
      data = rawData
    } else if (rawData && typeof rawData === "object") {
      if (Array.isArray(rawData.states)) {
        data = rawData.states
      } else if (Array.isArray(rawData.regions)) {
        data = rawData.regions
      } else if (Array.isArray(rawData.data)) {
        data = rawData.data
      } else {
        console.error("API повернуло невідому структуру:", JSON.stringify(rawData).slice(0, 500))
        return NextResponse.json({
          ok: false,
          alerts: [],
          detailedAlerts: [],
          oblastsWithAlerts: [],
          oblastString: null,
          error: "Невідома структура даних від API",
          debug: Object.keys(rawData),
        })
      }
    }

    // Збираємо ID областей з активними тривогами
    const oblastsWithAlertsSet = new Set<string>()
    
    // Детальна інформація про всі тривоги (включаючи райони та громади)
    const detailedAlerts: {
      regionId: string
      regionName: string
      regionType: string
      oblastId?: string
      oblastName?: string
      alertType: string
      alertTypeName: string
      alertIcon: string
      startedAt?: string
      lastUpdate: string
    }[] = []

    data.forEach((region) => {
      const regionId = region.regionId
      const regionType = region.regionType || "Unknown"
      const activeAlerts = region.activeAlerts || []

      if (activeAlerts.length > 0) {
        activeAlerts.forEach((alert) => {
          const alertType = alert.type || "AIR"
          const alertInfo = ALERT_TYPES[alertType] || ALERT_TYPES["UNKNOWN"]
          
          // Визначаємо область
          let oblastId: string | undefined
          let oblastName: string | undefined
          
          if (regionType === "State") {
            oblastId = regionId
            oblastsWithAlertsSet.add(regionId)
          } else if (DISTRICT_TO_OBLAST[regionId]) {
            oblastId = DISTRICT_TO_OBLAST[regionId]
            oblastsWithAlertsSet.add(oblastId)
          }
          
          if (oblastId) {
            oblastName = REGION_ID_TO_NAME[oblastId]
          }
          
          detailedAlerts.push({
            regionId,
            regionName: region.regionName,
            regionType,
            oblastId,
            oblastName,
            alertType,
            alertTypeName: alertInfo.name,
            alertIcon: alertInfo.icon,
            startedAt: alert.startedAt,
            lastUpdate: alert.lastUpdate,
          })
        })
      }
    })

    // Формуємо спрощені дані про тривоги по областях
    const alerts = Array.from(oblastsWithAlertsSet).map((oblastId) => {
      const regionData = data.find((r) => r.regionId === oblastId)
      const oblastName = regionData?.regionName || REGION_ID_TO_NAME[oblastId] || `Область ${oblastId}`
      
      // Знаходимо всі тривоги для цієї області
      const oblastAlerts = detailedAlerts.filter(
        (a) => a.oblastId === oblastId || a.regionId === oblastId
      )
      
      // Знаходимо найранішу тривогу
      const earliestAlert = oblastAlerts.reduce((earliest, current) => {
        if (!earliest.startedAt) return current
        if (!current.startedAt) return earliest
        return new Date(current.startedAt) < new Date(earliest.startedAt) ? current : earliest
      }, oblastAlerts[0])
      
      return {
        regionId: oblastId,
        regionName: oblastName,
        activeAlert: true,
        alertType: earliestAlert?.alertType || "AIR",
        alertTypeName: earliestAlert?.alertTypeName || "Повітряна тривога",
        startedAt: earliestAlert?.startedAt,
        lastUpdate: earliestAlert?.lastUpdate || new Date().toISOString(),
        alertsCount: oblastAlerts.length,
      }
    })

    // Запит до IoT API для отримання быстрого статусу (опціонально)
    let oblastString: string | null = null
    try {
      const oblastRes = await fetch(
        "https://api.ukrainealarm.com/api/v1/iot/active_air_raid_alerts_by_oblast.json",
        { cache: "no-store" }
      )
      if (oblastRes.ok) {
        const text = await oblastRes.text()
        oblastString = text.replace(/"/g, "").trim()
      }
    } catch (e) {
      console.warn("Помилка IoT API:", e)
    }

    // Сортуємо тривоги за часом початку (найновіші зверху)
    detailedAlerts.sort((a, b) => {
      const timeA = a.startedAt || ""
      const timeB = b.startedAt || ""
      return timeB.localeCompare(timeA)
    })

    return NextResponse.json({
      ok: true,
      alerts, // Спрощені дані по областях для карти
      detailedAlerts, // Детальні дані включаючи райони та громади
      oblastsWithAlerts: Array.from(oblastsWithAlertsSet), // Список ID областей з тривогами
      oblastString,
      totalAlertsCount: detailedAlerts.length,
      oblastsCount: oblastsWithAlertsSet.size,
      lastUpdate: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Помилка API тривог:", error)
    return NextResponse.json({
      ok: false,
      alerts: [],
      detailedAlerts: [],
      oblastsWithAlerts: [],
      oblastString: null,
      error: String(error),
    })
  }
}
