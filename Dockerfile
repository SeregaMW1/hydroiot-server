FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["node","build/src/index.js"]
