# Live-Ready Deployment Guide

## Overview

This deployment guide covers the production-ready enhancements implemented for the Alchemy Smart Wallet ecosystem. The system now includes comprehensive failover mechanisms, advanced security, gas optimization, cross-network support, and extensive monitoring.

## Prerequisites

### Required Services
- PostgreSQL 15+ (with connection pooling)
- Redis 6+ (for session storage and caching)
- Node.js 18+ 
- SSL certificate for HTTPS

### API Keys Required
- **Alchemy API Key** (primary blockchain provider)
- **Infura API Key** (fallback provider)
- **Ankr API Key** (fallback provider)  
- **QuickNode Endpoint** (optional fallback)
- **Gasless.cash API Key** (for gasless transactions)

### Optional Monitoring Services
- Sentry (error tracking)
- DataDog (performance monitoring)
- New Relic (application monitoring)

## Environment Configuration

### 1. Copy Environment Template
```bash
cp .env.production.example .env
```

### 2. Configure Core Settings
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Primary and Fallback Providers
ALCHEMY_API_KEY=your_alchemy_key
INFURA_API_KEY=your_infura_key
ANKR_API_KEY=your_ankr_key
QUICKNODE_ENDPOINT=your_quicknode_url

# Gasless Transactions
GASLESS_CASH_API_KEY=your_gasless_cash_key

# Security
SESSION_SECRET=generate_64_character_random_string
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### 3. Configure Monitoring (Optional)
```bash
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key
SLACK_WEBHOOK_URL=your_slack_webhook
```

## Deployment Steps

### 1. Build Application
```bash
npm install
npm run build
```

### 2. Database Setup
```bash
npm run db:push
```

### 3. Start Production Server
```bash
npm start
```

### 4. Verify Health
```bash
curl https://your-domain.com/api/health
```

## Docker Deployment

### 1. Build Docker Image
```bash
docker build -t alchemy-wallet:latest .
```

### 2. Run with Docker Compose
```bash
docker-compose -f docker-compose.staging.yml up -d
```

### 3. Monitor Services
```bash
# Application logs
docker-compose logs -f app

# Database logs  
docker-compose logs -f postgres

# Redis logs
docker-compose logs -f redis
```

## Kubernetes Deployment

### 1. Create ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alchemy-wallet-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  # Add other non-sensitive config
```

### 2. Create Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: alchemy-wallet-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
  ALCHEMY_API_KEY: "..."
  SESSION_SECRET: "..."
  # Add other sensitive data
```

### 3. Deploy Application
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alchemy-wallet
spec:
  replicas: 3
  selector:
    matchLabels:
      app: alchemy-wallet
  template:
    metadata:
      labels:
        app: alchemy-wallet
    spec:
      containers:
      - name: app
        image: alchemy-wallet:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: alchemy-wallet-config
        - secretRef:
            name: alchemy-wallet-secrets
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Security Configuration

### 1. Enable Security Features
```bash
# In .env
ENABLE_SECURITY_HEADERS=true
ENABLE_CSRF_PROTECTION=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Configure CORS
```bash
ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

### 3. Set Up SSL/TLS
- Use Let's Encrypt for free SSL certificates
- Configure HTTP to HTTPS redirect
- Set HSTS headers (automatically done by security service)

### 4. Network Security
- Use VPC/private subnets for database
- Configure security groups/firewalls
- Enable DDoS protection
- Use WAF (Web Application Firewall)

## Monitoring Setup

### 1. Application Monitoring
The application exposes several monitoring endpoints:

```bash
# Health check with comprehensive status
GET /api/health

# Provider health and failover status
GET /api/providers/health

# Security statistics
GET /api/security/stats

# Network health across all chains
GET /api/networks/health

# Performance metrics
GET /api/monitoring/performance

# Security events
GET /api/monitoring/security
```

### 2. Grafana Dashboard
```bash
# Start monitoring stack
npm run monitoring:setup
docker-compose -f docker-compose.staging.yml up grafana prometheus

# Access Grafana
http://localhost:3001
Username: admin
Password: [from GRAFANA_PASSWORD env var]
```

### 3. Alerting Rules
Configure alerts for:
- High error rates (>5%)
- Slow response times (>2s average)
- Provider failures
- Security events (high/critical)
- Database connection issues

## Performance Optimization

### 1. Database Optimization
```bash
# Connection pooling
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=10000

# Query optimization
LOG_SQL_QUERIES=false  # Only for debugging
```

### 2. Caching
```bash
# Redis configuration
REDIS_URL=redis://localhost:6379
REDIS_SESSION_PREFIX=alchemy_wallet_session:
```

### 3. Gas Optimization
```bash
# Enable gas optimization features
GAS_OPTIMIZATION_ENABLED=true
BATCH_TRANSACTION_ENABLED=true
BATCH_WINDOW_MS=30000
MAX_BATCH_SIZE=10
```

## Load Balancing

### 1. Multiple Instances
Deploy multiple application instances behind a load balancer:

```bash
# Scale with Docker Compose
docker-compose up --scale app=3

# Or with Kubernetes
kubectl scale deployment alchemy-wallet --replicas=5
```

### 2. Session Affinity
Use Redis for session storage to avoid sticky sessions:
```bash
REDIS_URL=redis://your-redis-cluster
```

### 3. Database Read Replicas
Configure read replicas for better performance:
```bash
DATABASE_URL=postgresql://primary-host:5432/db
DATABASE_READ_URL=postgresql://replica-host:5432/db
```

## Backup and Recovery

### 1. Database Backups
```bash
# Automated backups to S3
BACKUP_S3_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Daily backup cron job
0 2 * * * pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz && aws s3 cp backup-*.sql.gz s3://$BACKUP_S3_BUCKET/
```

### 2. Disaster Recovery
- Deploy in multiple availability zones
- Regular disaster recovery testing
- Automated failover procedures
- Data replication across regions

## Testing in Production

### 1. Health Checks
```bash
# Basic health
curl https://your-domain.com/api/health

# Provider health
curl https://your-domain.com/api/providers/health

# Network connectivity
curl https://your-domain.com/api/networks/health
```

### 2. Load Testing
```bash
# Install load testing tool
npm install -g loadtest

# Test API endpoints
loadtest -n 1000 -c 10 https://your-domain.com/api/chains
loadtest -n 500 -c 5 https://your-domain.com/api/networks
```

### 3. Security Testing
```bash
# Run security tests
npm run test:security

# Manual security validation
curl -X POST https://your-domain.com/api/security/validate-address \
  -H "Content-Type: application/json" \
  -d '{"address":"<script>alert(1)</script>","networkId":1}'
```

## Troubleshooting

### 1. Common Issues

**Provider Failures**
```bash
# Check provider health
curl https://your-domain.com/api/providers/health

# Check logs for failover events
docker logs alchemy-wallet | grep "Provider.*failed"
```

**Rate Limiting Issues**
```bash
# Check rate limit headers
curl -I https://your-domain.com/api/chains

# Adjust rate limits if needed
RATE_LIMIT_MAX_REQUESTS=200  # Increase limit
```

**Database Connection Issues**
```bash
# Check connection pool status
curl https://your-domain.com/api/health | jq '.metrics'

# Increase pool size if needed
DB_POOL_MAX=30
```

### 2. Performance Issues
```bash
# Monitor response times
curl https://your-domain.com/api/monitoring/performance

# Check for slow queries
LOG_SQL_QUERIES=true  # Temporarily enable for debugging

# Monitor memory usage
docker stats alchemy-wallet
```

### 3. Security Alerts
```bash
# Check recent security events
curl https://your-domain.com/api/monitoring/security

# Review blocked IPs
curl https://your-domain.com/api/security/stats
```

## Maintenance

### 1. Regular Updates
- Update dependencies monthly
- Apply security patches immediately
- Monitor for new vulnerabilities
- Test updates in staging first

### 2. Database Maintenance
```bash
# Vacuum and analyze (PostgreSQL)
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Clean old session data
DELETE FROM sessions WHERE expires < NOW() - INTERVAL '7 days';
```

### 3. Log Rotation
```bash
# Configure log rotation
/var/log/alchemy-wallet/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 node node
}
```

## Support and Monitoring

### 1. 24/7 Monitoring
- Set up PagerDuty or similar for critical alerts
- Monitor uptime with external services
- Track business metrics and SLAs

### 2. Performance Baselines
- Response time: < 2s average
- Uptime: > 99.9%
- Error rate: < 1%
- Provider failover: < 5s

### 3. Capacity Planning
- Monitor resource usage trends
- Plan for traffic growth
- Scale infrastructure proactively
- Regular performance testing

This deployment guide ensures your Alchemy Smart Wallet is production-ready with enterprise-grade reliability, security, and performance.