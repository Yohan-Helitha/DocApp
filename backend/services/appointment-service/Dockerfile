FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install --silent

COPY . .

EXPOSE 4003

CMD ["node", "server.js"]
