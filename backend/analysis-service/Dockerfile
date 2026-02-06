# ==============================================================================
# EloInsight Analysis Service - Go + Stockfish
# ==============================================================================

# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git make

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build the binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -a -installsuffix cgo \
    -o analysis-service ./cmd/server

# Final stage
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    stockfish \
    ca-certificates \
    tzdata \
    wget

# Install grpc_health_probe for health checks
RUN wget -qO/bin/grpc_health_probe https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/v0.4.24/grpc_health_probe-linux-amd64 && \
    chmod +x /bin/grpc_health_probe

# Create non-root user
RUN adduser -D -g '' -u 1001 appuser

# Copy binary from builder
COPY --from=builder --chown=appuser:appuser /app/analysis-service .

# Switch to non-root user
USER appuser

# Environment variables
ENV STOCKFISH_PATH=/usr/bin/stockfish \
    GRPC_PORT=50051 \
    WORKER_POOL_SIZE=4 \
    STOCKFISH_THREADS=4 \
    STOCKFISH_HASH=2048 \
    STOCKFISH_MULTI_PV=3 \
    DEFAULT_DEPTH=20 \
    ANALYSIS_TIMEOUT_SECONDS=60 \
    LOG_LEVEL=info \
    LOG_FORMAT=json

# Expose gRPC port
EXPOSE 50051

# Health check using grpc_health_probe
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /bin/grpc_health_probe -addr=:50051 || exit 1

# Run the service
CMD ["./analysis-service"]
