# Security

## Table of Contents
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [Infrastructure Security](#infrastructure-security)
- [Best Practices](#best-practices)

## Authentication & Authorization

### JWT Authentication

**Token Structure**:
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-id",
    "email": "user@example.com",
    "iat": 1641900000,
    "exp": 1641900900
  }
}
```

**Implementation**:
```typescript
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(user: User) {
    const payload = { sub: user.id, email: user.email };
    
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
```

### Password Security

**Hashing with bcrypt**:
```typescript
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Role-Based Access Control (RBAC)

```typescript
enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

## Data Protection

### Encryption at Rest

**PostgreSQL Encryption**:
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive data
INSERT INTO linked_accounts (access_token)
VALUES (pgp_sym_encrypt('token', 'encryption-key'));

-- Decrypt
SELECT pgp_sym_decrypt(access_token, 'encryption-key') FROM linked_accounts;
```

### Encryption in Transit

**TLS/SSL Configuration**:
```typescript
// NestJS HTTPS
const httpsOptions = {
  key: fs.readFileSync('./secrets/private-key.pem'),
  cert: fs.readFileSync('./secrets/certificate.pem'),
};

await NestFactory.create(AppModule, { httpsOptions });
```

### Sensitive Data Handling

**Environment Variables**:
```bash
# .env
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=your-encryption-key-min-32-chars
```

**Never commit**:
- API keys
- Database credentials
- JWT secrets
- Encryption keys
- OAuth tokens

## API Security

### Rate Limiting

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
  ],
})
export class AppModule {}
```

### Input Validation

```typescript
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  username: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  password: string;
}
```

### CORS Configuration

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### SQL Injection Prevention

```typescript
// ✅ Good: Parameterized queries
await db.query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ Bad: String concatenation
await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

### XSS Prevention

```typescript
import helmet from 'helmet';

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
  },
}));
```

## Infrastructure Security

### Docker Security

```dockerfile
# Use non-root user
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Read-only filesystem
VOLUME ["/app/data"]
```

### Environment Isolation

```yaml
# docker-compose.yml
services:
  api:
    environment:
      - NODE_ENV=production
    networks:
      - internal
    # Don't expose ports directly
    
  nginx:
    ports:
      - "443:443"
    networks:
      - internal
      - external
```

### Secrets Management

```bash
# Use Docker secrets
docker secret create jwt_secret ./jwt_secret.txt

# Or environment-specific secrets
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=your-secret
```

## Best Practices

### Security Checklist

**Authentication**:
- ✅ Use JWT with short expiration
- ✅ Implement refresh token rotation
- ✅ Hash passwords with bcrypt (12+ rounds)
- ✅ Implement account lockout after failed attempts
- ✅ Require email verification

**Authorization**:
- ✅ Implement RBAC
- ✅ Validate user permissions on every request
- ✅ Use principle of least privilege

**Data Protection**:
- ✅ Encrypt sensitive data at rest
- ✅ Use TLS/SSL for all connections
- ✅ Never log sensitive data
- ✅ Implement data retention policies

**API Security**:
- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ API versioning

**Monitoring**:
- ✅ Log all authentication attempts
- ✅ Monitor for suspicious activity
- ✅ Set up alerts for security events
- ✅ Regular security audits

### Security Headers

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

### Audit Logging

```typescript
@Injectable()
export class AuditLogger {
  async logEvent(event: AuditEvent) {
    await this.db.auditLogs.create({
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: new Date(),
    });
  }
}
```

---

**Next Steps**: See [deployment.md](deployment.md) for deployment guide.
