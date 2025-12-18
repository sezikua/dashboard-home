// Спільне сховище для даних про тривоги
// Використовується як API polling, так і WebHook

export interface ActiveAlert {
  regionId: string
  regionType: string
  type: string
  lastUpdate: string
}

export interface RegionAlert {
  regionId: string
  regionType: string
  regionName: string
  regionEngName?: string
  lastUpdate: string
  activeAlerts: ActiveAlert[]
}

export interface AlertData {
  regionId: string
  regionName: string
  activeAlert: boolean
  lastUpdate: string
  alertTypes: string[]
}

// Кеш тривог по регіонах (regionId -> дані)
const alertsCache = new Map<string, RegionAlert>()

// Час останнього оновлення через polling
let lastPollingTime = 0

// Час останнього оновлення через webhook
let lastWebhookTime = 0

// Oblast string з IoT API
let oblastString: string | null = null

// Список regionId областей (без районів та громад)
export const OBLAST_IDS = [
  "3", "4", "5", "8", "9", "10", "11", "12", "13", "14", "15", "16",
  "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28",
  "29", "30", "31"
]

// Оновити дані регіону (від webhook або polling)
export function updateRegionAlert(region: RegionAlert): void {
  if (OBLAST_IDS.includes(region.regionId)) {
    alertsCache.set(region.regionId, region)
    lastWebhookTime = Date.now()
  }
}

// Оновити всі регіони (від polling)
export function updateAllRegions(regions: RegionAlert[]): void {
  // Оновлюємо тільки області
  regions.forEach((region) => {
    if (OBLAST_IDS.includes(region.regionId)) {
      alertsCache.set(region.regionId, region)
    }
  })
  lastPollingTime = Date.now()
}

// Оновити oblast string
export function updateOblastString(str: string): void {
  oblastString = str
}

// Отримати oblast string
export function getOblastString(): string | null {
  return oblastString
}

// Отримати всі тривоги у форматі для фронтенду
export function getAlerts(): AlertData[] {
  const alerts: AlertData[] = []
  
  alertsCache.forEach((region) => {
    alerts.push({
      regionId: region.regionId,
      regionName: region.regionName,
      activeAlert: region.activeAlerts && region.activeAlerts.length > 0,
      lastUpdate: region.lastUpdate,
      alertTypes: region.activeAlerts?.map((a) => a.type) || [],
    })
  })
  
  return alerts
}

// Перевірити, чи є дані
export function hasData(): boolean {
  return alertsCache.size > 0
}

// Отримати час останнього оновлення
export function getLastUpdateTime(): number {
  return Math.max(lastPollingTime, lastWebhookTime)
}

// Перевірити, чи потрібно оновити через polling
export function needsPolling(ttlMs: number): boolean {
  const now = Date.now()
  // Якщо webhook оновлював недавно - не потрібно polling
  if (now - lastWebhookTime < ttlMs) {
    return false
  }
  // Якщо polling давно не було - потрібно
  return now - lastPollingTime > ttlMs
}
