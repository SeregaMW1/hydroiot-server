FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "build/index.js"]
