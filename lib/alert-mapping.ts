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
 * Інтерфейс для тривоги з API alerts.in.ua
 * Згідно з документацією: https://api.alerts.in.ua/docs
 */
export interface ApiAlert {
  id: number
  location_title: string
  location_type: "oblast" | "raion" | "city" | "hromada" | "unknown"
  started_at: string
  finished_at: string | null // null = активна тривога
  updated_at: string
  alert_type: "air_raid" | "artillery_shelling" | "urban_fights" | "chemical" | "nuclear"
  location_uid: string // Унікальний ідентифікатор локації
  location_oblast?: string
  location_oblast_uid?: string
  location_raion?: string
  notes?: string
  calculated?: boolean
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
    // API alerts.in.ua повертає location_uid як рядок
    const locationUid = alert.location_uid !== undefined 
      ? String(alert.location_uid)
      : null
    
    if (!locationUid) {
      // Логування для дебагу
      if (process.env.NODE_ENV === 'development') {
        console.warn('Alert without location_uid:', alert);
      }
      return;
    }
    
    // Визначаємо, чи тривога активна:
    // Згідно з документацією API: finished_at === null означає активну тривогу
    // Перевіряємо alert_type === 'air_raid' для повітряних тривог
    const alertType = alert.alert_type || alert.alertType || ''
    const isActive = alert.finished_at === null && alertType === 'air_raid'
    
    // Логування для дебагу (тільки в development, для всіх областей)
    if (process.env.NODE_ENV === 'development' && isActive) {
      const regionName = LOCATION_MAPPING[locationUid] ? `Region ID ${LOCATION_MAPPING[locationUid]}` : 'Unknown'
      console.log(`🔍 Активна тривога - ${regionName} (UID: ${locationUid}):`, {
        locationUid,
        finished_at: alert.finished_at,
        alert_type: alertType,
        isActive
      });
    }
    
    // Якщо для цього UID вже є активна тривога, залишаємо її
    // Якщо ні, але поточна тривога активна - встановлюємо
    const currentStatus = activeAlertsByUid.get(locationUid) || false
    activeAlertsByUid.set(locationUid, currentStatus || isActive)
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
    } else {
      // Логування для невідомих location_uid (тільки в development)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ location_uid "${locationUid}" не знайдено в мапінгу!`);
      }
    }
  })
  
  // Додаємо поле isAlert до кожного регіону
  const result = regions.map((region) => ({
    ...region,
    isAlert: alertsByRegionId.get(region.id) || false,
  }))
  
  // Загальне логування для всіх регіонів з тривогами (тільки в development)
  if (process.env.NODE_ENV === 'development') {
    const regionsWithAlerts = result.filter(r => r.isAlert);
    if (regionsWithAlerts.length > 0) {
      console.log(`✅ Регіони з активними тривогами (${regionsWithAlerts.length}):`, 
        regionsWithAlerts.map(r => `${r.title} (ID: ${r.id})`).join(', ')
      );
    } else {
      console.log('ℹ️ Активних тривог немає');
    }
  }
  
  return result;
}

