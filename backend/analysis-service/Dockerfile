# ==============================================================================
# EloInsight Analysis Service - Go + Stockfish
# Multi-architecture support (AMD64 + ARM64)
# ==============================================================================

# Stage 1: Build Stockfish from source
FROM alpine:3.19 AS stockfish-builder

RUN apk add --no-cache git make g++

WORKDIR /build

# Clone and build Stockfish
# Using generic profile for maximum compatibility
RUN git clone --depth 1 --branch sf_17 https://github.com/official-stockfish/Stockfish.git && \
    cd Stockfish/src && \
    make -j$(nproc) build ARCH=armv8

# Stage 2: Build Go application
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git make

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build the binary with optimizations
# Auto-detect architecture
RUN CGO_ENABLED=0 go build \
    -ldflags="-w -s" \
    -a -installsuffix cgo \
    -o analysis-service ./cmd/server

# Stage 3: Final runtime image
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    wget \
    libstdc++ \
    libgcc

# Detect architecture and download appropriate grpc_health_probe
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "arm64" ]; then \
    wget -qO/bin/grpc_health_probe https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/v0.4.24/grpc_health_probe-linux-arm64; \
    else \
    wget -qO/bin/grpc_health_probe https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/v0.4.24/grpc_health_probe-linux-amd64; \
    fi && \
    chmod +x /bin/grpc_health_probe

# Create non-root user
RUN adduser -D -g '' -u 1001 appuser

# Copy Stockfish binary from stockfish-builder
COPY --from=stockfish-builder /build/Stockfish/src/stockfish /usr/bin/stockfish
RUN chmod +x /usr/bin/stockfish

# Copy Go binary from builder
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
