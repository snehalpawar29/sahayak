from node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate
COPY src ./src
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node","src/server.js"]