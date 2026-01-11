.PHONY: all build proto clean run test lint docker

# Binary name
BINARY_NAME=analysis-service
BUILD_DIR=bin

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOTEST=$(GOCMD) test
GOMOD=$(GOCMD) mod
GOFMT=gofmt
GOLINT=golangci-lint

# Proto parameters
PROTOC=protoc
PROTO_DIR=proto
PROTO_OUT=proto

all: proto build

# Build the binary
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	$(GOBUILD) -o $(BUILD_DIR)/$(BINARY_NAME) ./cmd/server

# Generate protobuf files
proto:
	@echo "Generating protobuf files..."
	$(PROTOC) --go_out=$(PROTO_OUT) --go_opt=paths=source_relative \
		--go-grpc_out=$(PROTO_OUT) --go-grpc_opt=paths=source_relative \
		$(PROTO_DIR)/analysis.proto

# Run the service
run: build
	@echo "Running $(BINARY_NAME)..."
	./$(BUILD_DIR)/$(BINARY_NAME)

# Run in development mode
dev:
	@echo "Running in development mode..."
	go run ./cmd/server

# Run tests
test:
	@echo "Running tests..."
	$(GOTEST) -v -race ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	$(GOTEST) -v -race -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

# Format code
fmt:
	@echo "Formatting code..."
	$(GOFMT) -s -w .

# Run linter
lint:
	@echo "Running linter..."
	$(GOLINT) run ./...

# Tidy dependencies
tidy:
	@echo "Tidying dependencies..."
	$(GOMOD) tidy

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	$(GOMOD) download

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@rm -f coverage.out coverage.html

# Build Docker image
docker:
	@echo "Building Docker image..."
	docker build -t eloinsight/analysis-service:latest .

# Install tools
install-tools:
	@echo "Installing tools..."
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Help
help:
	@echo "Available targets:"
	@echo "  all          - Generate proto and build"
	@echo "  build        - Build the binary"
	@echo "  proto        - Generate protobuf files"
	@echo "  run          - Build and run the service"
	@echo "  dev          - Run in development mode"
	@echo "  test         - Run tests"
	@echo "  test-coverage- Run tests with coverage"
	@echo "  fmt          - Format code"
	@echo "  lint         - Run linter"
	@echo "  tidy         - Tidy dependencies"
	@echo "  deps         - Download dependencies"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker       - Build Docker image"
	@echo "  install-tools- Install development tools"
