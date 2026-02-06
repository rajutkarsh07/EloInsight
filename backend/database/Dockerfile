# ==============================================================================
# EloInsight Database - Prisma Migrations Runner
# ==============================================================================
# This container is used for running database migrations and seeding.
# It's not a long-running service - it runs migrations and exits.

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and migrations
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript (for seed script)
RUN npm run build

# Default command runs migrations
CMD ["npx", "prisma", "migrate", "deploy"]
