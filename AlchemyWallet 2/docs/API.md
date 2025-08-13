# Enhanced API Documentation

## Overview

The Alchemy Smart Wallet API provides comprehensive blockchain wallet functionality with advanced security, gas optimization, cross-network support, and real-time monitoring. This API is production-ready with enterprise-grade reliability.

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via session cookies. The API uses OAuth 2.0 with Replit for authentication.

```http
GET /api/auth/user
Authorization: Session-based (cookies)
```

## Rate Limiting

The API implements intelligent rate limiting with different limits for different endpoint types:

- **Authentication endpoints**: 5 requests per 15 minutes
- **Transaction endpoints**: 10 requests per minute  
- **Gasless endpoints**: 20 requests per 5 minutes
- **General API endpoints**: 100 requests per minute

Rate limit information is provided in response headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-01T12:00:00Z
```

## Security Features

- **Input Validation**: All inputs are validated and sanitized
- **XSS Protection**: Automatic HTML encoding and CSP headers
- **SQL Injection Prevention**: Parameterized queries and input filtering
- **CSRF Protection**: Token-based CSRF protection for state-changing operations
- **Reentrancy Protection**: Financial operations are protected against reentrancy attacks

## Core Endpoints

### Health and Status

#### Get Health Status
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "metrics": {
    "transactions": {
      "total": 1250,
      "sponsored": 890,
      "failed": 12,
      "averageDuration": 2340,
      "gasEfficiency": 87.5
    },
    "api": {
      "totalRequests": 15000,
      "averageResponseTime": 234,
      "errorRate": 0.8,
      "slowRequestsCount": 5
    },
    "securityEvents": 23
  },
  "security": {
    "blockedIPs": 3,
    "activeRateLimits": 12,
    "recentSecurityEvents": 2
  },
  "providers": {
    "1": [
      {
        "name": "alchemy",
        "enabled": true,
        "healthScore": 98,
        "consecutiveFailures": 0,
        "isHealthy": true,
        "latency": 145,
        "uptime": 99.9,
        "circuitBreakerOpen": false
      }
    ]
  }
}
```

### Network Management

#### Get Supported Networks
```http
GET /api/networks
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Ethereum",
    "type": "evm",
    "nativeCurrency": {
      "name": "Ether",
      "symbol": "ETH",
      "decimals": 18
    },
    "rpcUrls": ["https://eth-mainnet.g.alchemy.com/v2/"],
    "blockExplorerUrls": ["https://etherscan.io"],
    "enabled": true,
    "testnet": false
  },
  {
    "id": "solana-mainnet",
    "name": "Solana",
    "type": "solana",
    "nativeCurrency": {
      "name": "Solana",
      "symbol": "SOL",
      "decimals": 9
    },
    "rpcUrls": ["https://api.mainnet-beta.solana.com"],
    "blockExplorerUrls": ["https://explorer.solana.com"],
    "enabled": true,
    "testnet": false
  }
]
```

#### Get Network Health
```http
GET /api/networks/health
```

**Response:**
```json
{
  "1": {
    "healthy": true,
    "latency": 145
  },
  "solana-mainnet": {
    "healthy": true,
    "latency": 89
  }
}
```

#### Get Provider Health
```http
GET /api/providers/health?chainId=1
Authorization: Required
```

**Response:**
```json
[
  {
    "name": "alchemy",
    "enabled": true,
    "healthScore": 98,
    "consecutiveFailures": 0,
    "isHealthy": true,
    "latency": 145,
    "uptime": 99.9,
    "circuitBreakerOpen": false
  },
  {
    "name": "infura",
    "enabled": true,
    "healthScore": 95,
    "consecutiveFailures": 0,
    "isHealthy": true,
    "latency": 167,
    "uptime": 99.8,
    "circuitBreakerOpen": false
  }
]
```

### Wallet Management

#### Get User Wallets
```http
GET /api/wallets
Authorization: Required
```

#### Create Smart Wallet
```http
POST /api/wallets
Authorization: Required
Content-Type: application/json

{
  "address": "0x1234567890123456789012345678901234567890",
  "chainId": 1
}
```

### Balance Management

#### Get Unified Balances
```http
GET /api/balances/unified?networkId=1
Authorization: Required
```

**Response:**
```json
[
  {
    "address": "0x1234567890123456789012345678901234567890",
    "networkId": 1,
    "networkType": "evm",
    "nativeBalance": "1500000000000000000",
    "tokens": [
      {
        "address": "0xA0b86a33E6441E78C4B8C9B1E5FaB12A3456789",
        "symbol": "USDC",
        "name": "USD Coin",
        "balance": "1000000000",
        "decimals": 6,
        "logoUrl": "https://example.com/usdc-logo.png"
      }
    ]
  }
]
```

#### Refresh Balances
```http
POST /api/balances/refresh
Authorization: Required
```

### Transaction Management

#### Get Transactions
```http
GET /api/transactions?limit=50
Authorization: Required
```

#### Unified Transaction Sending
```http
POST /api/transactions/unified
Authorization: Required
Content-Type: application/json

{
  "transaction": {
    "to": "0x1234567890123456789012345678901234567890",
    "value": "1000000000000000000",
    "data": "0x"
  },
  "networkId": 1
}
```

#### Estimate Transaction Fees
```http
POST /api/transactions/estimate-fees
Content-Type: application/json

{
  "transaction": {
    "to": "0x1234567890123456789012345678901234567890",
    "value": "1000000000000000000"
  },
  "networkId": 1
}
```

**Response:**
```json
{
  "fee": "21000000000000000",
  "gasLimit": "21000"
}
```

### Gasless Transactions

#### Get Gasless Quote
```http
POST /api/transactions/gasless/quote
Authorization: Required
Content-Type: application/json

{
  "to": "0x1234567890123456789012345678901234567890",
  "value": "1000000000000000000",
  "data": "0x",
  "chainId": 1
}
```

**Response:**
```json
{
  "canSponsor": true,
  "estimatedCost": 0.025,
  "remainingBudget": 9.975,
  "quotedGasLimit": "21000",
  "quotedGasPrice": "20000000000"
}
```

#### Submit Gasless Transaction
```http
POST /api/transactions/gasless
Authorization: Required
Content-Type: application/json

{
  "to": "0x1234567890123456789012345678901234567890",
  "value": "1000000000000000000",
  "data": "0x",
  "chainId": 1,
  "walletId": "wallet-uuid",
  "urgency": "medium"
}
```

**Response:**
```json
{
  "transaction": {
    "id": "tx-uuid",
    "hash": "0xabcdef...",
    "status": "pending"
  },
  "hash": "0xabcdef...",
  "sponsored": true,
  "gasEstimate": {
    "gasLimit": "23100",
    "gasPrice": "18000000000",
    "estimatedCost": 0.0234,
    "confidence": 0.95
  },
  "optimizationStrategies": [
    {
      "name": "Transaction Batching",
      "savings": 15,
      "recommendation": "Batch with 3 pending transactions",
      "applicable": true
    }
  ],
  "estimatedCost": 0.025,
  "sponsorshipCost": 0.023,
  "service": "gasless.cash"
}
```

#### Get Gasless Statistics
```http
GET /api/gasless/stats
Authorization: Required
```

**Response:**
```json
{
  "totalTransactions": 156,
  "totalGasSponsored": "2.456",
  "monthlyUsage": 8.75,
  "monthlyLimit": 50.0
}
```

### Gas Optimization

#### Optimize Gas for Transaction
```http
POST /api/gas/optimize
Authorization: Required
Content-Type: application/json

{
  "transaction": {
    "to": "0x1234567890123456789012345678901234567890",
    "value": "1000000000000000000"
  },
  "chainId": 1,
  "urgency": "medium"
}
```

**Response:**
```json
{
  "gasEstimate": {
    "gasLimit": "23100",
    "gasPrice": "18000000000",
    "maxFeePerGas": "22000000000",
    "maxPriorityFeePerGas": "2000000000",
    "estimatedCost": 0.0234,
    "confidence": 0.95
  },
  "optimizationStrategies": [
    {
      "name": "Transaction Batching",
      "savings": 25,
      "recommendation": "Batch with 5 pending transactions",
      "applicable": true
    },
    {
      "name": "Optimal Timing",
      "savings": 15,
      "recommendation": "Wait until 3:00 for lower gas prices",
      "applicable": true
    }
  ]
}
```

#### Get Gas Analytics
```http
GET /api/gas/analytics?chainId=1&timeframe=86400000
Authorization: Required
```

**Response:**
```json
{
  "averageGasPrice": 25000000000,
  "medianGasPrice": 22000000000,
  "peakHours": [16, 17, 18, 19],
  "optimalTimeWindows": [
    {
      "start": 2,
      "end": 8,
      "avgGasPrice": 18000000000
    }
  ],
  "costTrends": [
    {
      "timestamp": 1704067200000,
      "gasPrice": 25000000000,
      "cost": 0.000525
    }
  ]
}
```

#### Optimize Ongoing Transaction
```http
GET /api/gas/optimize-ongoing/0xabcdef...?chainId=1
Authorization: Required
```

**Response:**
```json
{
  "canOptimize": true,
  "recommendations": [
    "Current gas price has decreased. Consider replacing with lower gas price.",
    "Transaction has been pending for over 5 minutes. Consider gas price acceleration."
  ],
  "potentialSavings": 0.0045
}
```

### Security

#### Validate Address
```http
POST /api/security/validate-address
Content-Type: application/json

{
  "address": "0x1234567890123456789012345678901234567890",
  "networkId": 1
}
```

**Response:**
```json
{
  "valid": true
}
```

#### Get Security Statistics
```http
GET /api/security/stats
Authorization: Required
```

**Response:**
```json
{
  "blockedIPs": 15,
  "activeRateLimits": 45,
  "recentSecurityEvents": 8
}
```

### Monitoring

#### Get Transaction Monitoring
```http
GET /api/monitoring/transactions?timeframe=3600000
Authorization: Required
```

**Response:**
```json
{
  "total": 234,
  "sponsored": 189,
  "failed": 3,
  "averageDuration": 2340,
  "gasEfficiency": 87.5
}
```

#### Get Security Events
```http
GET /api/monitoring/security?severity=high&timeframe=3600000
Authorization: Required
```

**Response:**
```json
[
  {
    "type": "suspicious_transaction",
    "timestamp": 1704067200000,
    "severity": "high",
    "details": {
      "reason": "Multiple failed authentication attempts",
      "ipAddress": "192.168.1.100",
      "attempts": 5
    }
  }
]
```

#### Get Performance Metrics
```http
GET /api/monitoring/performance?timeframe=3600000
Authorization: Required
```

**Response:**
```json
{
  "totalRequests": 5680,
  "averageResponseTime": 245,
  "errorRate": 1.2,
  "slowRequestsCount": 12
}
```

## Error Handling

The API uses standard HTTP status codes and returns detailed error information:

### Error Response Format
```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "address",
    "reason": "Invalid format"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., reentrancy)
- `413 Payload Too Large` - Request size exceeded
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

## Webhooks

Configure webhooks for real-time notifications:

### Transaction Events
```json
{
  "event": "transaction.completed",
  "data": {
    "hash": "0xabcdef...",
    "status": "confirmed",
    "gasUsed": "21000",
    "cost": 0.0234
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Security Events
```json
{
  "event": "security.alert",
  "data": {
    "type": "rate_limit_exceeded",
    "severity": "medium",
    "details": {
      "ipAddress": "192.168.1.100",
      "endpoint": "/api/transactions"
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## SDKs and Libraries

### JavaScript/TypeScript
```javascript
import { AlchemyWalletClient } from '@alchemy/wallet-sdk';

const client = new AlchemyWalletClient({
  baseUrl: 'https://your-domain.com/api',
  apiKey: 'your-api-key'
});

// Get unified balance
const balance = await client.getUnifiedBalance('0x...', 1);

// Send gasless transaction
const tx = await client.sendGaslessTransaction({
  to: '0x...',
  value: '1000000000000000000',
  chainId: 1
});
```

### Python
```python
from alchemy_wallet import WalletClient

client = WalletClient(
    base_url='https://your-domain.com/api',
    api_key='your-api-key'
)

# Get gas optimization
optimization = client.optimize_gas(
    transaction={'to': '0x...', 'value': '1000000000000000000'},
    chain_id=1,
    urgency='medium'
)
```

## Best Practices

### 1. Error Handling
- Always check response status codes
- Implement exponential backoff for retries
- Handle rate limiting gracefully

### 2. Security
- Validate all user inputs
- Use HTTPS in production
- Implement proper authentication
- Monitor for suspicious activity

### 3. Performance
- Cache frequently accessed data
- Use appropriate timeouts
- Implement connection pooling
- Monitor response times

### 4. Gas Optimization
- Use gas estimation before transactions
- Consider batching multiple operations
- Monitor gas price trends
- Implement retry logic for failed transactions

This API provides enterprise-grade functionality for blockchain wallet operations with comprehensive security, monitoring, and optimization features.