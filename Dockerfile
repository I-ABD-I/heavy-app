FROM node:22-alpine AS base

FROM base AS deps
# setup workdir
WORKDIR /app

# install deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM base AS builder
# setup workdir
WORKDIR /app

# copy deps & code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# build
RUN npm run build

FROM base AS runner

# setup workdir
WORKDIR /app

# declare env
ENV NODE_ENV=production

# add users
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# copy project files
COPY --from=builder /app/dist ./
COPY --from=builder /app/node_modules ./node_modules
COPY heavy-cert.pem heavy-key.pem ./

USER expressjs

EXPOSE 3001

ENV PORT=3001

CMD ["node", "index.js"]
