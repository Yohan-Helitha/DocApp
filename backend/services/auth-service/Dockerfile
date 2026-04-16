FROM node:18

WORKDIR /app

COPY package*.json ./

# Install only production dependencies inside the image
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

EXPOSE 4001

CMD ["node", "server.js"]