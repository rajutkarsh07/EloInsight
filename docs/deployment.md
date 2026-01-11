# Deployment Guide

## Table of Contents
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Local Development

### Prerequisites
- Node.js >= 18.x
- Go >= 1.21
- Python >= 3.11
- Docker & Docker Compose
- PostgreSQL >= 15
- Redis >= 7.0
- Stockfish 16

### Setup Steps

1. **Clone Repository**
```bash
git clone https://github.com/yourusername/EloInsight.git
cd EloInsight
```

2. **Environment Variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start Infrastructure**
```bash
docker-compose up -d postgres redis rabbitmq
```

4. **Database Migration**
```bash
cd services/api-gateway
npm install
npm run migration:run
```

5. **Start Services**

**Frontend**:
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

**API Gateway**:
```bash
cd services/api-gateway
npm install
npm run start:dev
# http://localhost:4000
```

**Analysis Engine**:
```bash
cd services/analysis-engine
go mod download
go run cmd/server/main.go
# http://localhost:5001
```

**Metadata Service**:
```bash
cd services/metadata-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python src/main.py
# http://localhost:6000
```

## Docker Deployment

### Docker Compose

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: eloinsight
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  api-gateway:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  analysis-engine:
    build:
      context: ./services/analysis-engine
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://rabbitmq:5672
    depends_on:
      - postgres
      - redis
      - rabbitmq
    restart: unless-stopped

  metadata-service:
    build:
      context: ./services/metadata-service
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_URL: ${API_URL}
    ports:
      - "3000:80"
    depends_on:
      - api-gateway
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
```

### Build & Run

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Production Deployment

### Kubernetes Deployment

**namespace.yaml**:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: eloinsight
```

**postgres-deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: eloinsight
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: eloinsight
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

**api-gateway-deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: eloinsight
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: eloinsight/api-gateway:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: eloinsight
spec:
  selector:
    app: api-gateway
  ports:
  - port: 4000
    targetPort: 4000
  type: ClusterIP
```

**ingress.yaml**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: eloinsight-ingress
  namespace: eloinsight
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.eloinsight.dev
    - eloinsight.dev
    secretName: eloinsight-tls
  rules:
  - host: api.eloinsight.dev
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 4000
  - host: eloinsight.dev
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=$JWT_SECRET \
  --from-literal=database-url=$DATABASE_URL \
  -n eloinsight

# Deploy services
kubectl apply -f k8s/

# Check status
kubectl get pods -n eloinsight
kubectl get services -n eloinsight

# View logs
kubectl logs -f deployment/api-gateway -n eloinsight
```

## Monitoring

### Prometheus & Grafana

**prometheus.yml**:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:4000']
  
  - job_name: 'analysis-engine'
    static_configs:
      - targets: ['analysis-engine:5001']
```

### Health Checks

```typescript
@Get('health')
async healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    services: {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      queue: await this.checkQueue(),
    }
  };
}
```

### Logging

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('AppName');

logger.log('Info message');
logger.error('Error message', trace);
logger.warn('Warning message');
logger.debug('Debug message');
```

## Troubleshooting

### Common Issues

**Database Connection Failed**:
```bash
# Check database is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d eloinsight

# Check logs
docker logs postgres
```

**Redis Connection Failed**:
```bash
# Test connection
redis-cli ping

# Check logs
docker logs redis
```

**Service Won't Start**:
```bash
# Check logs
docker-compose logs service-name

# Rebuild
docker-compose build service-name
docker-compose up -d service-name
```

**High Memory Usage**:
```bash
# Check resource usage
docker stats

# Limit resources in docker-compose.yml
services:
  api-gateway:
    deploy:
      resources:
        limits:
          memory: 512M
```

---

**Next Steps**: See [roadmap.md](roadmap.md) for future plans.
