# HydroIoT Server (CloudAMQP → Render → Firebase)

Масштабируемый сервер телеметрии: защищённый webhook, запись в Firestore, REST API, SSE, health-checks.

## Быстрый старт (локально)
```bash
npm i
cp .env.example .env   # заполните секреты
npm run dev
# Откройте http://localhost:3000/test
```

## Deploy на Render
- Web Service → Node
- Build: `npm install && npm run build`
- Start: `npm start`
- Добавьте переменные окружения из `.env.example`

## Эндпоинты
- `POST /webhook/telemetry` (header `x-hydroiot-token`)
- `GET /api/telemetry/latest?uid=...&deviceId=...&limit=10` (header token)
- `GET /api/telemetry/list?uid=...&deviceId=...&limit=50&cursor=...` (header token)
- `GET /api/telemetry/stream?uid=...&deviceId=...&exp=...&sig=...` (SSE с HMAC-подписью)
- `GET /health`, `GET /ready`

## SSE подпись
```
exp = Math.floor(Date.now()/1000) + 3600
sig = HMAC_SHA256(`${uid}:${deviceId}:${exp}`, SSE_HMAC_SECRET)
```
