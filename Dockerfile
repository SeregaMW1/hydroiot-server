# Используем Node 20 (совместимо с TypeScript, Firebase, pino)
FROM node:20-alpine

# Рабочая папка
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая devDependencies)
RUN npm install

# Копируем весь проект внутрь контейнера
COPY . .

# Сборка TypeScript → dist/
RUN npm run build

# Production mode
ENV NODE_ENV=production

# Открываем порт 3000
EXPOSE 3000

# Запускаем сервер из dist/index.js
CMD ["node", "dist/index.js"]
