# Alchemy Smart Wallet - Production Ready

A comprehensive smart wallet application built with React, Express.js, and integrated with Alchemy's blockchain infrastructure and gasless.cash for gasless transactions.

## 🚀 Features

- **Multi-Chain Support**: Ethereum, BSC, Polygon, Base, and Arbitrum
- **Gasless Transactions**: Integrated with gasless.cash for seamless user experience
- **Real-Time Monitoring**: Performance and security monitoring with alerting
- **Comprehensive Testing**: End-to-end testing with Playwright
- **Production Ready**: Docker deployment with staging environment
- **Security First**: Advanced security monitoring and rate limiting

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)

## 🏁 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis (for session storage)
- Alchemy API Key
- Gasless.cash API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd alchemy-smart-wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │───▶│  Express API    │───▶│   PostgreSQL    │
│   (Frontend)    │    │   (Backend)     │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐               │
         │              │ Gasless.cash    │               │
         │              │ Integration     │               │
         │              └─────────────────┘               │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Alchemy SDK   │    │   Monitoring    │    │   Redis Cache   │
│  (Blockchain)   │    │   Service       │    │  (Sessions)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Services

- **AlchemyService**: Blockchain data and operations
- **GaslessCashService**: Gasless transaction processing
- **MonitoringService**: Performance and security monitoring
- **Storage**: Database operations and caching

## 📖 API Documentation

### Authentication

All authenticated endpoints require a valid session cookie.

```http
GET /api/auth/user
```

### Wallets

```http
GET /api/wallets
POST /api/wallets
```

### Gasless Transactions

```http
POST /api/transactions/gasless
POST /api/transactions/gasless/quote
GET /api/gasless/stats
```

### Monitoring

```http
GET /api/health
GET /api/monitoring/transactions
GET /api/monitoring/security
GET /api/monitoring/performance
```

## 🚀 Deployment

### Staging Environment

1. **Configure environment**
   ```bash
   cp .env.staging.example .env.staging
   # Edit with staging values
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.staging.yml up -d
   ```

3. **Access services**
   - Application: http://localhost:3000
   - Grafana: http://localhost:3001
   - Prometheus: http://localhost:9090

### Production Deployment

1. **Build Docker image**
   ```bash
   docker build -t alchemy-wallet:latest .
   ```

2. **Deploy to your preferred platform**
   - AWS ECS/Fargate
   - Google Cloud Run
   - Azure Container Instances
   - Kubernetes

## 📊 Monitoring

The application includes comprehensive monitoring:

### Health Checks

- Application health: `/api/health`
- Database connectivity
- External service availability

### Metrics

- Transaction performance
- API response times
- Error rates
- Security events

### Alerting

- Critical security events
- Performance degradation
- Service failures

## 🛠️ Development

### Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/         # React hooks
│   │   └── lib/           # Utilities
├── server/                # Express backend
│   ├── services/          # Business logic
│   ├── routes.ts          # API routes
│   └── index.ts           # Server entry
├── shared/                # Shared types/schemas
├── tests/                 # Test files
└── docs/                  # Documentation
```

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run check        # TypeScript check
npm run test         # Run tests
npm run db:push      # Deploy database schema
```

### Code Quality

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Automated testing with Playwright

## 🧪 Testing

### End-to-End Tests

```bash
npm run test:e2e
```

Tests cover:
- Wallet management workflows
- Gasless transaction processing
- API endpoint functionality
- Security validations

### Test Structure

- `tests/e2e/wallet-functionality.spec.ts` - Core wallet features
- `tests/e2e/api-integration.spec.ts` - API endpoint testing

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `ALCHEMY_API_KEY` | Alchemy API key | Yes |
| `GASLESS_CASH_API_KEY` | Gasless.cash API key | Yes |
| `REPLIT_CLIENT_ID` | Replit OAuth client ID | Yes |
| `REPLIT_CLIENT_SECRET` | Replit OAuth secret | Yes |
| `SESSION_SECRET` | Session encryption secret | Yes |

### Supported Chains

- **Ethereum** (Chain ID: 1)
- **BSC** (Chain ID: 56)
- **Polygon** (Chain ID: 137)
- **Base** (Chain ID: 8453)
- **Arbitrum** (Chain ID: 42161)

## 🔐 Security

### Security Features

- Session-based authentication
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

### Security Monitoring

- Suspicious transaction detection
- Rate limit monitoring
- Invalid access attempts
- Performance anomaly detection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting guide
- Review the API documentation

---

**Note**: This application is designed for production use with proper security, monitoring, and deployment practices. Always follow security best practices when deploying to production environments.