# API Документація - Inverter Monitor API

## Загальна інформація

API сервер надає доступ до даних інвертора через інтернет з авторизацією по токену.

**Базовий URL:** `http://173.212.215.18:8080`

**Приклад повного URL:** `http://173.212.215.18:8080/api/inverter`

**Порт:** `8080`

**Протокол:** `HTTP`

---

## Авторизація

Для доступу до даних інвертора потрібен токен авторизації.

**Токен:**
```
f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7
```

### Способи передачі токену:

#### 1. Bearer Token в заголовку Authorization (рекомендовано)
```
Authorization: Bearer f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7
```

#### 2. Token як query параметр
```
?token=f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7
```

---

## API Endpoints

### 1. Отримати дані інвертора

**Endpoint:** `GET /api/inverter`

**Авторизація:** Обов'язкова (Bearer token або параметр token)

**Опис:** Повертає актуальні дані інвертора з файлу `/opt/Invertor/invertor.json`

**Приклад запиту з curl:**

```bash
# Варіант 1: Bearer token в заголовку
curl -H "Authorization: Bearer f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7" \
  http://173.212.215.18:8080/api/inverter

# Варіант 2: Token як параметр
curl "http://173.212.215.18:8080/api/inverter?token=f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7"
```

**Приклад запиту з JavaScript (fetch):**

```javascript
fetch('http://173.212.215.18:8080/api/inverter', {
  headers: {
    'Authorization': 'Bearer f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

**Приклад запиту з Python (requests):**

```python
import requests

url = "http://173.212.215.18:8080/api/inverter"
headers = {
    "Authorization": "Bearer f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data)
```

**Успішна відповідь (200 OK):**

```json
{
    "status": "success",
    "timestamp": "2026-01-29T21:15:53.677777",
    "data": {
        "exhibitionTime": "2026-01-29 22:11:53",
        "states": "normal",
        "acVoltage": 225.8,
        "acFrequency": 50.02,
        "outputVoltage": 226.2,
        "outputFrequency": 50.01,
        "loadPower": 203,
        "batteryVoltage": 53.1,
        "batteryCurrent": 8.6,
        "batteryPower": -456,
        "capacityPercentage": 94,
        "inverterName": "DCC2433109",
        "collectorName": "WZA2419940",
        "lastUpdate": "2026-01-29T21:15:48.203376",
        "powerId": 18380,
        "inverterId": 24988
    }
}
```

**Помилка авторизації (401 Unauthorized):**

```json
{
    "error": "Unauthorized",
    "message": "Invalid or missing token"
}
```

---

### 2. Health Check

**Endpoint:** `GET /api/inverter/health`

**Авторизація:** Не потрібна

**Опис:** Перевірка стану сервісу та файлу з даними

**Приклад запиту:**

```bash
curl http://173.212.215.18:8080/api/inverter/health
```

**Відповідь (200 OK):**

```json
{
    "status": "ok",
    "file_exists": true,
    "file_age_seconds": 4.487685441970825
}
```

---

### 3. Інформація про API

**Endpoint:** `GET /`

**Авторизація:** Не потрібна

**Опис:** Повертає інформацію про доступні endpoints

**Приклад запиту:**

```bash
curl http://173.212.215.18:8080/
```

**Відповідь (200 OK):**

```json
{
    "service": "Inverter Monitor API",
    "version": "1.0",
    "endpoints": {
        "/api/inverter": "GET - Отримати дані інвертора (потрібен токен)",
        "/api/inverter/health": "GET - Перевірка стану сервісу (без токену)"
    },
    "authentication": "Bearer token в заголовку Authorization або параметр token"
}
```

---

## Структура даних

### Поля в відповіді `/api/inverter`:

| Поле | Тип | Опис |
|------|-----|------|
| `exhibitionTime` | string | Час останнього оновлення даних |
| `states` | string | Статус інвертора (normal, error, etc.) |
| `acVoltage` | number | AC напруга (V) |
| `acFrequency` | number | AC частота (Hz) |
| `outputVoltage` | number | Вихідна напруга (V) |
| `outputFrequency` | number | Вихідна частота (Hz) |
| `loadPower` | number | Потужність навантаження (W) |
| `batteryVoltage` | number | Напруга батареї (V) |
| `batteryCurrent` | number | Струм батареї (A) |
| `batteryPower` | number | Потужність батареї (W), від'ємне значення = зарядка |
| `capacityPercentage` | number | Заряд батареї (%) |
| `inverterName` | string | Назва/серійний номер інвертора |
| `collectorName` | string | Назва колектора |
| `lastUpdate` | string | ISO timestamp останнього оновлення файлу |
| `powerId` | number | ID станції |
| `inverterId` | number | ID інвертора |

---

## Коди відповідей HTTP

| Код | Опис |
|-----|------|
| `200` | Успішний запит |
| `401` | Помилка авторизації (неправильний або відсутній токен) |
| `500` | Помилка сервера (файл не знайдено або помилка читання) |

---

## Приклади використання

### cURL

```bash
# Отримати дані з Bearer token
curl -H "Authorization: Bearer f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7" \
  http://173.212.215.18:8080/api/inverter

# Отримати дані з параметром token
curl "http://173.212.215.18:8080/api/inverter?token=f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7"

# Health check
curl http://173.212.215.18:8080/api/inverter/health
```

### Python

```python
import requests
import json

# Конфігурація
API_URL = "http://173.212.215.18:8080"
TOKEN = "f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7"

# Отримати дані інвертора
def get_inverter_data():
    url = f"{API_URL}/api/inverter"
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Помилка запиту: {e}")
        return None

# Використання
data = get_inverter_data()
if data and data.get('status') == 'success':
    inverter_data = data['data']
    print(f"AC Voltage: {inverter_data.get('acVoltage')}V")
    print(f"Battery: {inverter_data.get('capacityPercentage')}%")
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_URL = 'http://173.212.215.18:8080';
const TOKEN = 'f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7';

async function getInverterData() {
    try {
        const response = await axios.get(`${API_URL}/api/inverter`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        });
        
        if (response.data.status === 'success') {
            const data = response.data.data;
            console.log(`AC Voltage: ${data.acVoltage}V`);
            console.log(`Battery: ${data.capacityPercentage}%`);
            return data;
        }
    } catch (error) {
        console.error('Помилка:', error.message);
    }
}

getInverterData();
```

### PHP

```php
<?php
$apiUrl = 'http://173.212.215.18:8080/api/inverter';
$token = 'f7a9d2e1b8c34a5d9e0f21b7a6d5c4e3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $data = json_decode($response, true);
    if ($data['status'] === 'success') {
        $inverter = $data['data'];
        echo "AC Voltage: " . $inverter['acVoltage'] . "V\n";
        echo "Battery: " . $inverter['capacityPercentage'] . "%\n";
    }
} else {
    echo "Помилка: HTTP $httpCode\n";
}
?>
```

---

## Керування сервісом

### Systemd команди

```bash
# Перевірити статус
systemctl status inverter-api.service

# Запустити
systemctl start inverter-api.service

# Зупинити
systemctl stop inverter-api.service

# Перезапустити
systemctl restart inverter-api.service

# Переглянути логи
journalctl -u inverter-api.service -f

# Увімкнути автозапуск
systemctl enable inverter-api.service

# Вимкнути автозапуск
systemctl disable inverter-api.service
```

---

## Безпека

1. **Токен зберігається в:** `/opt/Invertor/api_server.py`
2. **Не передавайте токен у відкритому вигляді** в URL при можливості (краще використовувати заголовок Authorization)
3. **Використовуйте HTTPS** в production середовищі (потрібно налаштувати reverse proxy з SSL)
4. **Порт 8080** має бути відкритий у файрволі тільки для необхідних IP адрес (якщо можливо)

---

## Налаштування

### Зміна порту

Відредагуйте файл `/opt/Invertor/api_server.py`:

```python
PORT = 8080  # Змініть на потрібний порт
```

Після змін перезапустіть сервіс:
```bash
systemctl restart inverter-api.service
```

### Зміна токену

Відредагуйте файл `/opt/Invertor/api_server.py`:

```python
API_TOKEN = "ваш_новий_токен_тут"
```

Після змін перезапустіть сервіс:
```bash
systemctl restart inverter-api.service
```

---

## Troubleshooting

### API не відповідає

1. Перевірте статус сервісу:
   ```bash
   systemctl status inverter-api.service
   ```

2. Перевірте логи:
   ```bash
   journalctl -u inverter-api.service -n 50
   ```

3. Перевірте чи порт відкритий:
   ```bash
   netstat -tlnp | grep 8080
   ```

### Помилка 401 Unauthorized

- Перевірте правильність токену
- Перевірте формат заголовка Authorization (має бути `Bearer <token>`)
- Перевірте чи токен передається в запиті

### Помилка 500 Internal Server Error

- Перевірте чи існує файл `/opt/Invertor/invertor.json`
- Перевірте права доступу до файлу
- Перегляньте логи сервісу

---

## Контакти та підтримка

Файл з даними: `/opt/Invertor/invertor.json`
Логи API: `journalctl -u inverter-api.service`
Конфігурація: `/opt/Invertor/api_server.py`

---

**Останнє оновлення:** 2026-01-29
