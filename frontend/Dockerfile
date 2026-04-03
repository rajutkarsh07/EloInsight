# ==============================================================================
# EloInsight Frontend - Vite + React
# ==============================================================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=http://localhost:14000/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Production stage - Use nginx for serving static files
FROM nginx:alpine AS runner

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Set proper permissions
# Start nginx
CMD ["nginx", "-g", "daemon off;"]
