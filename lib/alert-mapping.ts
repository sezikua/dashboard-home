/**
 * Мапінг між location_uid з API та id регіонів з regions.ts
 * Ключ: location_uid з API, Значення: id з regions.ts
 */
export const LOCATION_MAPPING: Record<string, number> = {
  "4": 1,   // Вінницька
  "8": 2,   // Волинська
  "9": 3,   // Дніпропетровська
  "28": 4,  // Донецька
  "10": 5,  // Житомирська
  "11": 6,  // Закарпатська
  "12": 7,  // Запорізька
  "13": 8,  // Івано-Франківська
  "14": 9,  // Київська область
  "31": 9,  // м. Київ -> також мапиться на Київську область (ID 9)
  "15": 10, // Кіровоградська
  "16": 11, // Луганська
  "27": 12, // Львівська
  "17": 13, // Миколаївська
  "18": 14, // Одеська
  "19": 15, // Полтавська
  "5": 16,  // Рівненська
  "20": 17, // Сумська
  "21": 18, // Тернопільська
  "22": 19, // Харківська
  "23": 20, // Херсонська
  "3": 21,  // Хмельницька
  "24": 22, // Черкаська
  "26": 23, // Чернівецька
  "25": 24, // Чернігівська
  "29": 26, // АР Крим (ID 26 в regions.ts)
  "30": 26, // м. Севастополь -> також мапиться на АР Крим (ID 26)
}

/**
 * Інтерфейс для тривоги з API
 * API може повертати дані з різними полями, тому підтримуємо обидва варіанти
 */
export interface ApiAlert {
  location_uid?: string | number
  regionId?: string | number // Альтернативне поле
  finished_at?: string | null
  activeAlert?: boolean // Якщо дані вже оброблені
  [key: string]: any
}

/**
 * Інтерфейс для регіону з regions.ts
 */
export interface Region {
  id: number
  title: string
  titleX: number
  titleY: number
  fontSize: number
  d: string
  disabled?: boolean
  [key: string]: any
}

/**
 * Інтерфейс для регіону зі статусом тривоги
 */
export interface RegionWithStatus extends Region {
  isAlert: boolean
}

/**
 * Функція для отримання регіонів зі статусом тривог
 * @param alerts - масив тривог з API
 * @param regions - масив регіонів з regions.ts
 * @returns масив регіонів з додатковим полем isAlert
 */
export function getRegionsWithStatus(
  alerts: ApiAlert[],
  regions: Region[]
): RegionWithStatus[] {
  // Створюємо Map для швидкого пошуку активних тривог по location_uid
  const activeAlertsByUid = new Map<string, boolean>()
  
  alerts.forEach((alert) => {
    // Підтримуємо обидва формати: location_uid або regionId
    const locationUid = alert.location_uid !== undefined 
      ? String(alert.location_uid)
      : alert.regionId !== undefined
        ? String(alert.regionId)
        : null
    
    if (!locationUid) {
      // Логування для дебагу
      if (process.env.NODE_ENV === 'development') {
        console.warn('Alert without location_uid or regionId:', alert);
      }
      return;
    }
    
    // Визначаємо, чи тривога активна:
    // 1. Якщо є поле activeAlert - використовуємо його
    // 2. Якщо є finished_at - тривога активна, якщо finished_at === null
    // 3. Якщо є alertType === 'AIR_RAID' - тривога активна
    // 4. Інакше вважаємо неактивною
    const isActive = alert.activeAlert !== undefined
      ? alert.activeAlert
      : alert.finished_at !== undefined
        ? alert.finished_at === null
        : alert.alertType === 'AIR_RAID' || alert.alert_type === 'AIR_RAID'
          ? true
          : false
    
    // Якщо для цього UID вже є активна тривога, залишаємо її
    // Якщо ні, але поточна тривога активна - встановлюємо
    if (isActive || !activeAlertsByUid.has(locationUid)) {
      activeAlertsByUid.set(locationUid, isActive)
    }
  })
  
  // Створюємо Map для згрупованих тривог по id регіону
  // Оскільки один регіон може мати кілька UID (наприклад, Київська: 14 і 31)
  const alertsByRegionId = new Map<number, boolean>()
  
  activeAlertsByUid.forEach((isActive, locationUid) => {
    const regionId = LOCATION_MAPPING[locationUid]
    if (regionId !== undefined) {
      // Якщо для регіону вже є активна тривога, залишаємо її
      // Якщо поточна тривога активна - встановлюємо
      const currentStatus = alertsByRegionId.get(regionId) || false
      alertsByRegionId.set(regionId, currentStatus || isActive)
    }
  })
  
  // Додаємо поле isAlert до кожного регіону
  return regions.map((region) => ({
    ...region,
    isAlert: alertsByRegionId.get(region.id) || false,
  }))
}

