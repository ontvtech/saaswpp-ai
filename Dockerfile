# =============================================================================
# DOCKERFILE - SaaSWPP AI
# Multi-stage build para produção otimizada
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências do sistema
RUN apk add --no-cache python3 make g++

# Copia arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências
RUN npm ci

# Copia código fonte
COPY . .

# Gera cliente Prisma
RUN npx prisma generate

# Build da aplicação
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 saaswpp

# Copia arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Permissões
RUN chown -R saaswpp:nodejs /app

USER saaswpp

EXPOSE 3000

# Comando de inicialização
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
