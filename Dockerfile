# Production Dockerfile for MTC SmartBus
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors and lockfiles
COPY package.json bun.lock* package-lock.json* ./
COPY lib/ ./lib/
COPY artifacts/ ./artifacts/
COPY scripts/ ./scripts/
COPY tsconfig*.json ./
COPY server.ts ./

# Install dependencies and build client + server bundles
RUN npm install
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy root package.json and built distribution
COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY .env.example ./.env.example

EXPOSE 3000

CMD ["npm", "start"]
