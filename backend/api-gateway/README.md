# EloInsight API Gateway

NestJS REST API Gateway for authentication and request routing.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Development
npm run start:dev

# Production
npm run build && npm run start:prod
```

## API Documentation

**Swagger UI**: http://localhost:4000/api/docs

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | User registration |
| `POST` | `/auth/login` | User login |
| `POST` | `/auth/refresh` | Refresh tokens |
| `GET` | `/users/me` | Get current user |
| `GET` | `/games` | List user games |
| `POST` | `/sync/trigger` | Trigger game sync |

## Modules

| Module | Description |
|--------|-------------|
| **Auth** | JWT authentication |
| **Users** | User profiles & settings |
| **Games** | Game data endpoints |
| **Analysis** | Analysis requests |

## Documentation

See the main documentation:
- [Services Overview](../../docs/services.md)
- [API Design](../../docs/api-design.md)
- [Architecture](../../docs/architecture.md)

For testing endpoints and troubleshooting, see **[QUICKSTART.md](./QUICKSTART.md)**.
