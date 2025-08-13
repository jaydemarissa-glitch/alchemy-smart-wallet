# Alchemy SDK Configuration Guide

## Overview

This document provides guidance on properly configuring the Alchemy SDK within the AlchemyService.

## Current Implementation

The `AlchemyService` currently uses a minimal configuration:

```typescript
const alchemy = new Alchemy({
  apiKey: this.apiKey,
  network: config.network,
});
```

## Supported Configuration Options

The Alchemy SDK v3.6.2+ supports the following additional configuration options:

### Required Parameters
- `apiKey`: Your Alchemy API key
- `network`: The blockchain network (e.g., `Network.ETH_MAINNET`)

### Optional Parameters
- `maxRetries`: Number of retries for failed requests (default: 5)
- `requestTimeout`: Timeout for requests in milliseconds (default: 0 - no timeout)
- `batchRequests`: Enable batching of JSON-RPC requests (default: false)
- `url`: Custom endpoint URL (overrides network-generated URL)
- `authToken`: Required for Notify API features

## Example Advanced Configuration

If you need to customize the Alchemy client behavior, you can modify the constructor in `AlchemyService.initializeClients()`:

```typescript
const alchemy = new Alchemy({
  apiKey: this.apiKey,
  network: config.network,
  maxRetries: 3,              // Reduce retries for faster failure detection
  requestTimeout: 30000,      // 30 second timeout
  batchRequests: true,        // Enable request batching for better performance
});
```

## Compatibility Notes

- All configuration options are optional except `apiKey` and `network`
- The current minimal configuration is fully compatible with the Alchemy SDK
- Adding additional options will not break existing functionality
- The SDK handles backward compatibility for configuration changes

## Testing

The service includes compatibility tests to ensure that:
1. Current constructor patterns remain valid
2. Future `maxRetries` usage would be properly supported
3. All standard Alchemy SDK configurations work correctly

## Best Practices

1. **Start Simple**: Use minimal configuration unless specific requirements demand advanced options
2. **Test Changes**: Always run the test suite when modifying Alchemy configuration
3. **Document Custom Settings**: If adding custom configuration options, document the reasoning
4. **Monitor Performance**: Advanced options like `batchRequests` can affect performance characteristics

## Related Files

- `server/services/alchemyService.ts` - Main service implementation
- `server/services/__tests__/alchemyService.test.ts` - Compatibility tests
- This document - Configuration guidance