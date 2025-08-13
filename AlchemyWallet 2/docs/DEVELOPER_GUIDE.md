# Developer Guide

This guide helps developers understand, extend, and contribute to the Alchemy Smart Wallet project.

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ with npm
- PostgreSQL 15+
- Redis (optional, for session storage)
- Git
- Docker (for staging deployment)

### Local Development Environment

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd alchemy-smart-wallet
   npm install
   ```

2. **Database Setup**
   ```bash
   # Start PostgreSQL (via Docker if needed)
   docker run --name postgres-dev -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:15

   # Configure database URL in .env
   echo "DATABASE_URL=postgresql://postgres:dev@localhost:5432/alchemy_wallet_dev" >> .env
   
   # Push schema
   npm run db:push
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with development values
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture Deep Dive

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling
- TanStack Query for server state
- Wouter for routing
- Shadcn/UI component library

**Key Components:**
- `WalletDashboard` - Main wallet interface
- `GaslessManager` - Gasless transaction management
- `TransactionHistory` - Transaction listing and details
- `ChainSelector` - Multi-chain switching

**State Management:**
```typescript
// Example: Using React Query for server state
const { data: wallets, isLoading } = useQuery({
  queryKey: ["/api/wallets"],
  retry: false,
});
```

### Backend Architecture

**Technology Stack:**
- Express.js with TypeScript
- Drizzle ORM for database operations
- Passport.js for authentication
- WebSocket support for real-time updates

**Service Layer:**
```typescript
// Example service structure
class AlchemyService {
  async getTokenBalances(address: string, chainId: number) {
    // Implementation
  }
}
```

### Database Schema

**Core Tables:**
- `users` - User accounts and profiles
- `smart_wallets` - Multi-chain wallet addresses
- `assets` - Token/cryptocurrency definitions
- `token_balances` - User portfolio data
- `transactions` - Transaction history
- `gas_policies` - Gasless transaction policies

## 🔌 Adding New Blockchain Networks

### 1. Update Chain Configuration

```typescript
// server/services/alchemyService.ts
export const SUPPORTED_CHAINS = {
  // Existing chains...
  123: { 
    name: 'New Chain', 
    network: Network.NEW_CHAIN, 
    rpcUrl: 'https://new-chain.g.alchemy.com/v2/' 
  },
} as const;
```

### 2. Add Chain Support to Gasless.cash

```typescript
// server/services/gaslessCashService.ts
constructor() {
  this.config = {
    // ...existing config
    supportedChains: [1, 56, 137, 8453, 42161, 123], // Add new chain ID
  };
}
```

### 3. Update Frontend Chain Selector

```typescript
// Add chain to UI components
const chainConfig = {
  123: {
    name: 'New Chain',
    symbol: 'NEW',
    explorerUrl: 'https://explorer.newchain.com',
    logoUrl: '/chains/new-chain.svg'
  }
};
```

### 4. Test Integration

```typescript
// tests/e2e/blockchain-integration.spec.ts
test('should handle new chain transactions', async ({ page }) => {
  // Test new chain functionality
});
```

## 🔐 Security Best Practices

### Input Validation

Always validate inputs using Zod schemas:

```typescript
import { z } from 'zod';

const TransactionSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  value: z.string().regex(/^\d+$/),
  chainId: z.number().int().positive(),
});
```

### Authentication Middleware

```typescript
// Check authentication for protected routes
app.get('/api/protected', isAuthenticated, async (req: any, res) => {
  const userId = req.user.claims.sub;
  // Secure operation
});
```

### Rate Limiting

```typescript
// Implement rate limiting for sensitive operations
const rateLimit = require('express-rate-limit');

const gaslessLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 gasless transactions per window
});

app.post('/api/transactions/gasless', gaslessLimit, /* handler */);
```

## 📊 Monitoring and Observability

### Adding Custom Metrics

```typescript
// Track custom business metrics
monitoringService.trackCustomMetric('wallet_created', {
  chainId,
  userId,
  timestamp: Date.now(),
});
```

### Health Check Extensions

```typescript
// Add service-specific health checks
app.get('/api/health/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabaseHealth(),
    alchemy: await checkAlchemyHealth(),
    gaslessCash: await checkGaslessCashHealth(),
  };
  
  res.json(checks);
});
```

### Custom Alerts

```typescript
// Set up custom alerting logic
class CustomAlertService {
  async checkForAnomalies() {
    const stats = monitoringService.getTransactionStats();
    
    if (stats.failed > stats.total * 0.1) {
      await this.sendAlert('High failure rate detected');
    }
  }
}
```

## 🧪 Testing Guidelines

### Unit Tests

```typescript
// Example unit test structure
describe('GaslessCashService', () => {
  it('should get valid quote for transaction', async () => {
    const service = new GaslessCashService();
    const quote = await service.getGaslessQuote({
      to: '0x123...',
      value: '1000000',
      chainId: 1
    }, 'user123');
    
    expect(quote.canSponsor).toBe(true);
    expect(quote.estimatedCost).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// Test API endpoints
test('POST /api/transactions/gasless', async ({ request }) => {
  const response = await request.post('/api/transactions/gasless', {
    data: {
      to: '0x1234567890123456789012345678901234567890',
      value: '1000000',
      chainId: 1,
      walletId: 'wallet123'
    }
  });
  
  expect(response.ok()).toBeTruthy();
});
```

### E2E Tests

```typescript
// Test user workflows
test('user can create wallet and send gasless transaction', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="create-wallet"]');
  await page.click('[data-testid="send-gasless"]');
  // ... test complete workflow
});
```

## 🚀 Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_transactions_user_id_created_at 
ON transactions(user_id, created_at DESC);

CREATE INDEX idx_token_balances_user_wallet 
ON token_balances(user_id, wallet_id);
```

### Caching Strategy

```typescript
// Implement caching for expensive operations
const cache = new Map();

async function getCachedTokenPrice(symbol: string) {
  const cacheKey = `price_${symbol}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const price = await fetchTokenPrice(symbol);
  cache.set(cacheKey, price);
  
  // Expire after 5 minutes
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
  
  return price;
}
```

### Frontend Performance

```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Expensive rendering logic
});

// Implement virtual scrolling for large lists
import { VirtualizedList } from './VirtualizedList';

<VirtualizedList 
  items={transactions}
  itemHeight={64}
  renderItem={TransactionItem}
/>
```

## 🔧 Development Tools

### Custom Scripts

```json
{
  "scripts": {
    "dev:db": "docker run --name dev-postgres -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:15",
    "dev:redis": "docker run --name dev-redis -p 6379:6379 -d redis:7-alpine",
    "seed:dev": "tsx scripts/seed-dev-data.ts",
    "migrate:reset": "drizzle-kit drop && npm run db:push",
    "analyze:bundle": "npx vite-bundle-analyzer"
  }
}
```

### IDE Configuration

**.vscode/settings.json:**
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Git Hooks

```bash
# Install husky for git hooks
npm install --save-dev husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run check && npm run test"
```

## 📦 Deployment Strategies

### Blue-Green Deployment

```bash
# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# Run health checks
curl http://staging.example.com/api/health

# Switch production traffic
# Update load balancer configuration
```

### Rolling Updates

```bash
# Kubernetes deployment
kubectl apply -f k8s/
kubectl rollout status deployment/alchemy-wallet

# Monitor deployment
kubectl get pods -w
```

### Environment Promotion

```bash
# Promote staging to production
./scripts/promote-environment.sh staging production

# Rollback if needed
./scripts/rollback-deployment.sh
```

## 📚 Additional Resources

- [Alchemy SDK Documentation](https://docs.alchemy.com/reference/alchemy-sdk-quickstart)
- [Drizzle ORM Guide](https://orm.drizzle.team/docs/overview)
- [React Query Patterns](https://tkdodo.eu/blog/practical-react-query)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)

## 🤝 Contributing

### Code Style

- Use TypeScript strict mode
- Follow ESLint configuration
- Write descriptive commit messages
- Add tests for new features
- Update documentation

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Ensure CI passes
5. Request review

### Issue Reporting

Use the issue template to report:
- Bug reports with reproduction steps
- Feature requests with use cases
- Performance issues with profiling data
- Security vulnerabilities (use security contact)

---

Happy coding! 🚀