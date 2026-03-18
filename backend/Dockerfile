FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code (bust cache on code changes)
ARG CACHEBUST=1
COPY src ./src/

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy || echo 'Migration skipped (DB unreachable)'; node src/index.js"]
