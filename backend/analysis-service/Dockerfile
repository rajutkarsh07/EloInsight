# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git make protobuf-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o analysis-service ./cmd/server

# Final stage
FROM alpine:3.19

WORKDIR /app

# Install Stockfish
RUN apk add --no-cache stockfish ca-certificates tzdata

# Create non-root user
RUN adduser -D -g '' appuser
USER appuser

# Copy binary from builder
COPY --from=builder /app/analysis-service .

# Environment variables
ENV STOCKFISH_PATH=/usr/bin/stockfish
ENV GRPC_PORT=50051
ENV WORKER_POOL_SIZE=4
ENV STOCKFISH_THREADS=4
ENV STOCKFISH_HASH=2048
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json

# Expose gRPC port
EXPOSE 50051

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD grpc_health_probe -addr=:50051 || exit 1

# Run the service
CMD ["./analysis-service"]
