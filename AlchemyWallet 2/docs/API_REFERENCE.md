# API Documentation

## Overview

The Alchemy Smart Wallet API provides endpoints for managing multi-chain wallets, executing gasless transactions, and monitoring system performance.

**Base URL:** `http://localhost:3000/api`  
**Authentication:** Session-based (cookies)

## Authentication

### Login
```http
GET /auth/replit
```
Redirects to Replit OAuth login.

### Get Current User
```http
GET /api/auth/user
```
Returns authenticated user information.

**Response:**
```json
{
  "id": "user123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImageUrl": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Wallets

### List User Wallets
```http
GET /api/wallets
```

**Response:**
```json
[
  {
    "id": "wallet123",
    "address": "0x1234...5678",
    "chainId": 56,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Create Wallet
```http
POST /api/wallets
```

**Request Body:**
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "chainId": 56
}
```

## Assets & Balances

### Get Token Balances
```http
GET /api/balances?walletId=optional
```

**Response:**
```json
[
  {
    "id": "balance123",
    "balance": "1000000000000000000",
    "usdValue": 25.50,
    "asset": {
      "id": "asset123",
      "symbol": "BNB",
      "name": "Binance Coin",
      "decimals": 18,
      "chainId": 56,
      "logoUrl": "https://..."
    },
    "wallet": {
      "id": "wallet123",
      "address": "0x1234...5678",
      "chainId": 56
    }
  }
]
```

### Get Portfolio Summary
```http
GET /api/portfolio
```

**Response:**
```json
{
  "totalBalance": 1250.75,
  "change24h": 2.4,
  "assets": [
    {
      "id": "asset123",
      "name": "Binance Coin",
      "symbol": "BNB",
      "balance": "1000000000000000000",
      "usdValue": 25.50,
      "change24h": -1.2,
      "logoUrl": "https://...",
      "chainId": 56
    }
  ]
}
```

### Refresh Balances
```http
POST /api/balances/refresh
```
Fetches latest balance data from blockchain.

## Transactions

### Get Transaction History
```http
GET /api/transactions?limit=50
```

**Response:**
```json
[
  {
    "id": "tx123",
    "hash": "0xabcd...ef01",
    "chainId": 56,
    "chainName": "BSC",
    "type": "send",
    "status": "confirmed",
    "fromAddress": "0x1234...5678",
    "toAddress": "0x8765...4321",
    "amount": "1000000000000000000",
    "gasSponsor": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "asset": {
      "symbol": "BNB",
      "name": "Binance Coin"
    }
  }
]
```

### Submit Regular Transaction
```http
POST /api/transactions
```

**Request Body:**
```json
{
  "walletId": "wallet123",
  "hash": "0xabcd...ef01",
  "chainId": 56,
  "type": "send",
  "toAddress": "0x8765...4321",
  "amount": "1000000000000000000",
  "assetId": "asset123"
}
```

## Gasless Transactions

### Get Gasless Quote
```http
POST /api/transactions/gasless/quote
```

**Request Body:**
```json
{
  "to": "0x8765432109876543210987654321098765432109",
  "value": "1000000000000000000",
  "data": "0x",
  "chainId": 56
}
```

**Response:**
```json
{
  "canSponsor": true,
  "estimatedCost": 0.02,
  "remainingBudget": 9.98,
  "quotedGasLimit": "21000",
  "quotedGasPrice": "5000000000"
}
```

### Submit Gasless Transaction
```http
POST /api/transactions/gasless
```

**Request Body:**
```json
{
  "to": "0x8765432109876543210987654321098765432109",
  "value": "1000000000000000000",
  "data": "0x",
  "chainId": 56,
  "walletId": "wallet123"
}
```

**Response:**
```json
{
  "transaction": {
    "id": "tx123",
    "hash": "0xabcd...ef01",
    "status": "pending"
  },
  "hash": "0xabcd...ef01",
  "sponsored": true,
  "estimatedCost": 0.02,
  "sponsorshipCost": 0.018,
  "service": "gasless.cash"
}
```

### Get Gasless Statistics
```http
GET /api/gasless/stats
```

**Response:**
```json
{
  "totalTransactions": 25,
  "totalGasSponsored": "0.125",
  "monthlyUsage": 2.45,
  "monthlyLimit": 10.0
}
```

## Gas Policies

### List Gas Policies
```http
GET /api/gas-policies
```

**Response:**
```json
[
  {
    "id": "policy123",
    "chainId": 56,
    "isActive": true,
    "monthlyLimit": 10.0,
    "monthlyUsed": 2.45,
    "perTransactionLimit": 1.0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Create Gas Policy
```http
POST /api/gas-policies
```

**Request Body:**
```json
{
  "chainId": 56,
  "monthlyLimit": 10.0,
  "perTransactionLimit": 1.0
}
```

## Blockchain Networks

### Get Supported Chains
```http
GET /api/chains
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Ethereum",
    "rpcUrl": "https://eth-mainnet.g.alchemy.com/v2/..."
  },
  {
    "id": 56,
    "name": "BSC",
    "rpcUrl": "https://bnb-mainnet.g.alchemy.com/v2/..."
  }
]
```

## Monitoring & Health

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "metrics": {
    "transactions": {
      "total": 150,
      "sponsored": 75,
      "failed": 2,
      "averageDuration": 1250,
      "gasEfficiency": 95.5
    },
    "api": {
      "totalRequests": 1000,
      "averageResponseTime": 180,
      "errorRate": 0.5,
      "slowRequestsCount": 3
    },
    "securityEvents": 0
  }
}
```

### Transaction Monitoring
```http
GET /api/monitoring/transactions?timeframe=86400000
```

**Response:**
```json
{
  "total": 150,
  "sponsored": 75,
  "failed": 2,
  "averageDuration": 1250,
  "gasEfficiency": 95.5
}
```

### Security Events
```http
GET /api/monitoring/security?type=suspicious_transaction&severity=high
```

**Response:**
```json
[
  {
    "type": "suspicious_transaction",
    "userId": "user123",
    "ipAddress": "192.168.1.1",
    "timestamp": 1704067200000,
    "details": {
      "transactionHash": "0xabcd...ef01",
      "reason": "High transaction amount"
    },
    "severity": "high"
  }
]
```

### Performance Metrics
```http
GET /api/monitoring/performance?timeframe=86400000
```

**Response:**
```json
{
  "totalRequests": 1000,
  "averageResponseTime": 180,
  "errorRate": 0.5,
  "slowRequestsCount": 3
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service degraded |

## Error Response Format

```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error information"
  }
}
```

## Rate Limits

- **General API**: 100 requests per minute
- **Gasless Transactions**: 10 per 15 minutes
- **Balance Refresh**: 5 per minute
- **Authentication**: 10 login attempts per hour

## Webhooks (Future Feature)

The API will support webhooks for real-time notifications:

- Transaction confirmations
- Balance changes
- Security alerts
- System status updates

## SDK Examples

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/transactions/gasless', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '0x...',
    value: '1000000000000000000',
    chainId: 56,
    walletId: 'wallet123'
  })
});

const result = await response.json();
```

### cURL
```bash
curl -X POST http://localhost:3000/api/transactions/gasless \
  -H "Content-Type: application/json" \
  -d '{
    "to": "0x8765432109876543210987654321098765432109",
    "value": "1000000000000000000",
    "chainId": 56,
    "walletId": "wallet123"
  }'
```

---

For more examples and detailed integration guides, see the [Developer Guide](./DEVELOPER_GUIDE.md).