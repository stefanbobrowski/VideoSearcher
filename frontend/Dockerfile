# ---------- BUILD STAGE ----------
FROM node:22 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- RUNTIME STAGE ----------
FROM node:22
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "server.js"]
