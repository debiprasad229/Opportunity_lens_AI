# Multi-stage Dockerfile for OpportunityLens AI
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY shared ./shared/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY server ./server/
COPY client ./client/

# Build backend and frontend
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy root package and server package
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000

CMD ["node", "server/dist/server/src/index.js"]
