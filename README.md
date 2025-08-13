# Alchemy Smart Wallet

A secure and efficient smart wallet implementation using the Alchemy SDK.

## Features

- Multi-chain support (Ethereum, Polygon, Base, Arbitrum, BSC)
- Comprehensive Alchemy SDK integration with fallback providers
- Gas sponsorship capabilities (deprecated, use gaslessCashService)
- Robust error handling and monitoring
- Comprehensive unit testing with 74% code coverage
- CI/CD pipeline with automated testing and deployment

## Development

### Prerequisites

- Node.js 18+ or 20+
- npm

### Installation

```bash
cd "AlchemyWallet 2"
npm install
```

### Environment Variables

Create a `.env` file in the `AlchemyWallet 2` directory:

```env
ALCHEMY_API_KEY=your_alchemy_api_key_here
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type checking
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests for CI/CD

## Testing

The project includes comprehensive unit tests for the `alchemyService` component, covering:

- Constructor initialization with API key validation
- Multi-chain client management with fallback providers
- Token balance and metadata retrieval
- Transaction handling
- Gas price and native balance queries
- Gas sponsorship functionality (deprecated)
- Error handling scenarios

### Test Coverage

Current test coverage for `alchemyService`: **74.46%**

Run tests with coverage:

```bash
npm run test:coverage
```

## CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that:

### On every push and pull request:
- **Test**: Runs unit tests on Node.js 18.x and 20.x
- **Security**: Performs npm security audit
- **Build**: Creates production build
- **Coverage**: Reports test coverage metrics

### On push to `develop` branch:
- **Deploy to Staging**: Automatically deploys to staging environment

### On push to `main` branch:
- **Deploy to Production**: Automatically deploys to production environment

### Pipeline Features:
- ✅ Automated testing with multiple Node.js versions
- ✅ Test coverage reporting with Codecov integration
- ✅ Security vulnerability scanning
- ✅ Build artifact caching
- ✅ Environment-based deployments
- ✅ Deployment notifications

## Architecture

### AlchemyService

The core `AlchemyService` class provides:

- **Multi-chain Support**: Ethereum, Polygon, Base, Arbitrum, BSC
- **Client Management**: Automatic Alchemy SDK client initialization with provider fallback
- **Token Operations**: Balance queries, metadata retrieval
- **Transaction Handling**: Transaction and receipt retrieval
- **Gas Management**: Gas price queries and sponsorship (deprecated)
- **Error Handling**: Comprehensive error catching and monitoring integration

### Key Methods:

- `getTokenBalances(address, chainId)` - Get token balances for an address
- `getTokenMetadata(contractAddress, chainId)` - Get ERC-20 token metadata
- `getTransaction(hash, chainId)` - Get transaction details
- `getTransactionReceipt(hash, chainId)` - Get transaction receipt
- `getGasPrice(chainId)` - Get current gas price
- `getNativeBalance(address, chainId)` - Get native token balance
- `checkGasSponsorship(userId, chainId, estimatedGas)` - Check sponsorship eligibility (deprecated)
- `sponsorTransaction(transactionData, userId, chainId)` - Sponsor a transaction (deprecated)

### Provider Fallback

The service uses a `providerService` for robust multi-provider support:
- Primary Alchemy SDK client for supported chains
- Automatic fallback to alternative providers when primary fails
- Comprehensive error handling and monitoring

## Deployment

### Environment Setup

1. **Staging Environment**:
   - Branch: `develop`
   - Automatic deployment on push
   - Used for testing and validation

2. **Production Environment**:
   - Branch: `main`
   - Automatic deployment on push
   - Requires all tests to pass

### Deployment Configuration

The CI/CD pipeline supports various deployment targets. Update the deployment steps in `.github/workflows/ci-cd.yml` to match your hosting platform:

#### Vercel
```yaml
- name: Deploy to production
  run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

#### Netlify
```yaml
- name: Deploy to production
  run: npx netlify deploy --prod --auth ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

#### Custom Server
```yaml
- name: Deploy to production
  run: rsync -avz ./dist/ user@server:/path/to/app/
```

## Security

- Environment variables are used for sensitive data (API keys)
- npm audit is run in CI to check for vulnerabilities
- Dependencies are regularly updated
- API responses are validated and errors are handled gracefully
- Security monitoring integrated through monitoring service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

All pull requests trigger the CI pipeline and must pass all checks before merging.

## Migration Notes

### Deprecated Methods
- `checkGasSponsorship()` - Use `gaslessCashService.getGaslessQuote()` instead
- `sponsorTransaction()` - Use `gaslessCashService.submitGaslessTransaction()` instead

These methods are kept for backward compatibility but will log deprecation warnings.