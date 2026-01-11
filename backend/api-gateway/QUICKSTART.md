# API Gateway - Quick Start Guide

## ✅ Setup Complete!

Your NestJS API Gateway is fully configured and ready to use.

## 🚀 Start the Server

```bash
cd backend/api-gateway
npm run start:dev
```

Server will be available at:
- **API Base**: http://localhost:4000/api/v1
- **Swagger Docs**: http://localhost:4000/api/docs

## 🧪 Test the API

### 1. Login with Demo User

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@eloinsight.dev",
    "password": "password123"
  }'
```

**Response**:
```json
{
  "user": {
    "id": "1",
    "email": "demo@eloinsight.dev",
    "username": "demo"
  },
  "tokens": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 900
  }
}
```

### 2. Register New User

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "username": "newuser",
    "password": "password123"
  }'
```

### 3. Access Protected Endpoint

```bash
# Save the access token from login response
TOKEN="your_access_token_here"

curl -X GET http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get User Statistics

```bash
curl -X GET http://localhost:4000/api/v1/users/stats \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Get Games List

```bash
curl -X GET "http://localhost:4000/api/v1/games?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Request Game Analysis

```bash
curl -X POST http://localhost:4000/api/v1/analysis/game-123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "depth": 20,
    "priority": "normal"
  }'
```

## 📚 Explore Swagger Documentation

Open your browser and navigate to:
```
http://localhost:4000/api/docs
```

You can:
- View all available endpoints
- Test endpoints directly from the browser
- See request/response schemas
- Authorize with JWT token

## 🔐 Authentication Flow

1. **Login** → Get access token
2. **Use token** in `Authorization: Bearer <token>` header
3. **Token expires** after 15 minutes
4. **Refresh** using refresh token (valid for 7 days)

## 📁 Project Structure

```
backend/api-gateway/
├── src/
│   ├── auth/           # JWT authentication
│   ├── users/          # User endpoints
│   ├── games/          # Games endpoints (stub)
│   ├── analysis/       # Analysis endpoints (stub)
│   ├── app.module.ts   # Root module
│   └── main.ts         # Entry point
├── .env                # Environment variables
├── package.json        # Dependencies
└── README.md           # Full documentation
```

## 🎯 Next Steps

### Connect Frontend
Update frontend `.env`:
```
VITE_API_URL=http://localhost:4000/api/v1
```

### Add Database
1. Install PostgreSQL
2. Update `DATABASE_URL` in `.env`
3. Add TypeORM or Prisma
4. Replace in-memory storage

### Add Microservices
1. Create gRPC clients
2. Connect to Game Sync Service
3. Connect to Analysis Engine
4. Replace stub implementations

## 🐛 Troubleshooting

**Port 4000 already in use?**
```bash
lsof -ti:4000 | xargs kill -9
```

**Can't connect from frontend?**
- Check `CORS_ORIGIN` in `.env` matches frontend URL
- Ensure API is running on port 4000

**JWT errors?**
- Verify `JWT_SECRET` is set in `.env`
- Check token hasn't expired (15min lifetime)

## ✨ Features

- ✅ JWT Authentication
- ✅ Protected Routes
- ✅ Request Validation
- ✅ Swagger Documentation
- ✅ CORS Configuration
- ✅ API Versioning (v1)
- ✅ Modular Architecture
- ✅ TypeScript
- ✅ Environment Config

---

**Ready to build!** 🚀
