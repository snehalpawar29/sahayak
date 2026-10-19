
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./

# Prisma Client generation must not require production credentials.
RUN npx prisma generate

COPY certs/rds-global-bundle.pem /app/certs/rds-global-bundle.pem
COPY src ./src

ENV NODE_ENV=production

EXPOSE 5000

# Fail clearly if DATABASE_URL is missing at runtime.
CMD ["sh", "-c", ": \"${DATABASE_URL:?DATABASE_URL must be set}\" && npx prisma migrate deploy && npm start"]
