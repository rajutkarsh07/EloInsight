# API Gateway - Quick Start Guide

## ✅ Setup Complete!

Your NestJS API Gateway is fully configured and ready to use.

## 🚀 Start the Server

```bash
cd backend/api-gateway
npm run start:dev
```

Server will be available at:
- **API Base**: http://localhost:14000/api/v1
- **Swagger Docs**: http://localhost:14000/api/docs

## 🧪 Test the API

### 1. Start OAuth Login

Use one of the OAuth entry points:

```bash
xdg-open http://localhost:14000/api/v1/auth/lichess/login
```

or

```bash
xdg-open http://localhost:14000/api/v1/auth/google/login
```

### 2. Access Protected Endpoint

```bash
# Save the access token from login response
TOKEN="your_access_token_here"

curl -X GET http://localhost:14000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Get User Statistics

```bash
curl -X GET http://localhost:14000/api/v1/users/stats \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get Games List

```bash
curl -X GET "http://localhost:14000/api/v1/games?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Request Game Analysis

```bash
curl -X POST http://localhost:14000/api/v1/analysis/game-123 \
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
http://localhost:14000/api/docs
```

You can:
- View all available endpoints
- Test endpoints directly from the browser
- See request/response schemas
- Authorize with JWT token

## 🔐 Authentication Flow

1. **OAuth login** via Lichess or Google
2. **Frontend receives** access and refresh tokens from the callback flow
3. **Use token** in `Authorization: Bearer <token>` header
4. **Refresh** using refresh token when needed

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
VITE_API_URL=http://localhost:14000/api/v1
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

**Port 14000 already in use?**
```bash
lsof -ti:14000 | xargs kill -9
```

**Can't connect from frontend?**
- Check `CORS_ORIGIN` in `.env` matches frontend URL
- Ensure API is running on port 14000

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
