FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npx prisma generate

COPY certs/rds-global-bundle.pem /app/certs/rds-global-bundle.pem

COPY src ./src

ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]
