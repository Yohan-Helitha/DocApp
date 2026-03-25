FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production || npm install --production
COPY . ./
EXPOSE 4010
CMD ["node", "server.js"]
