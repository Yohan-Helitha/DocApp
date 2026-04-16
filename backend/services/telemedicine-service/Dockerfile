FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
# Install only production dependencies; skip dev tools like mocha/supertest
RUN npm install --omit=dev --no-audit --no-fund
COPY . ./
EXPOSE 4010
CMD ["node", "server.js"]
