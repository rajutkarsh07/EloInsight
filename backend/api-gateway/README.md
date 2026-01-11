# EloInsight API Gateway

NestJS-based REST API Gateway for the EloInsight chess analysis platform.

## 🎯 Purpose

The API Gateway serves as the **single entry point** for all client requests in the EloInsight microservices architecture. It handles:

- **Authentication & Authorization** (JWT-based)
- **Request Routing** to appropriate microservices
- **API Versioning** (v1, v2, etc.)
- **Request Validation** and transformation
- **API Documentation** (Swagger/OpenAPI)
- **CORS** configuration

## 🚀 Quick Start

For instructions on how to start the server, test endpoints with `curl`, and troubleshoot common issues, please see the **[Quick Start Guide](QUICKSTART.md)**.

## 🏗️ Architecture Role

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────────────┐
│   API Gateway       │
│   (NestJS)          │
│   - Auth (JWT)      │
│   - Validation      │
│   - Routing         │
└──────┬──────────────┘
       │ gRPC (future)
       ▼
┌──────────────────────────────┐
│     Microservices            │
│  ┌────────┬────────┬────────┐│
│  │ User   │ Game   │Analysis││
│  │Service │ Sync   │ Engine ││
│  └────────┴────────┴────────┘│
└──────────────────────────────┘
```

## 📦 Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Authentication**: JWT (Passport)
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI
- **Runtime**: Node.js 18+

## �️ Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

## 📚 API Documentation

Complete interactive documentation with request/response schemas is available via Swagger UI when the server is running:

- **Swagger Docs**: `http://localhost:4000/api/docs`
- **Base URL**: `http://localhost:4000/api/v1`

### Key Modules

#### 1. Auth Module (`/auth`)
Handles user registration, login, and token management.
- Uses **JWT** (JSON Web Tokens) for stateless authentication.
- Passwords are hashed using **bcrypt**.
- Includes token refresh mechanism.

#### 2. Users Module (`/users`)
Manages user profiles and statistics.
- Protected by JWT Guard.
- Fetches aggregated data.

#### 3. Games Module (Stub) (`/games`)
Manages chess game data.
- Lists games with pagination.
- Syncs games from external platforms (Chess.com, Lichess).
- *Future*: Will act as a proxy to the Game Sync Service.

#### 4. Analysis Module (Stub) (`/analysis`)
Handles game analysis requests.
- Retrieving analysis reports.
- Queuing new analysis jobs.
- *Future*: Will act as a proxy to the Analysis Engine.

## 🔐 Authentication Flow

1.  **Register/Login**: Client sends credentials -> API returns `accessToken` (short-lived) and `refreshToken` (long-lived).
2.  **Protected Requests**: Client sends `Authorization: Bearer <accessToken>`.
3.  **Token Refresh**: When `accessToken` expires (401), Client uses `refreshToken` to get a new pair.

## 📁 Project Structure

```
src/
├── auth/                    # Authentication logic & strategies
├── users/                   # User profile management
├── games/                   # Game data & sync endpoints
├── analysis/                # Analysis reporting & queuing
├── common/                  # Shared guards, decorators, filters
├── app.module.ts           # Root module
└── main.ts                 # Application entry point
```

## 🔧 Module Responsibilities

| Module | Responsibility | Future Integration |
|--------|----------------|-------------------|
| **Auth** | Identity & Access Management | Identity Service |
| **Users** | User Profiles & Settings | User Microservice |
| **Games** | Game Data Aggregation | Game Sync Service (gRPC) |
| **Analysis** | Chess Engine Interface | Stockfish Cluster (gRPC) |

## 🛡️ Security Features

- **JWT Authentication**: Secure, stateless access control.
- **Validation**: Strict DTO validation using `class-validator`.
- **CORS**: Configurable origin policies.
- **Environment Config**: Sensitive data isolation.

## 📝 Development Notes

### Adding a New Module
```bash
nest g module <name>
nest g controller <name>
nest g service <name>
```

### Swagger Annotations
Use `@ApiTags`, `@ApiOperation`, and `@ApiResponse` decorators to keep the Swagger documentation up to date.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.
