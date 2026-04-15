FROM node:18-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --only=production || npm install --only=production --legacy-peer-deps

COPY . .

EXPOSE 4006
CMD ["npm", "start"]
