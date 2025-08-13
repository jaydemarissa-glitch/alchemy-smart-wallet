import { test, expect } from '@playwright/test';

test.describe('API Health and Monitoring', () => {
  test('health endpoint should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
  });

  test('chains endpoint should return supported chains', async ({ request }) => {
    const response = await request.get('/api/chains');
    expect(response.ok()).toBeTruthy();
    
    const chains = await response.json();
    expect(Array.isArray(chains)).toBeTruthy();
    expect(chains.length).toBeGreaterThan(0);
    
    // Check for required chain properties
    chains.forEach(chain => {
      expect(chain.id).toBeDefined();
      expect(chain.name).toBeDefined();
      expect(chain.rpcUrl).toBeDefined();
    });
  });
});

test.describe('Authentication Flow', () => {
  test('should handle unauthenticated requests properly', async ({ request }) => {
    // Test protected endpoints return proper error when not authenticated
    const protectedEndpoints = [
      '/api/auth/user',
      '/api/wallets',
      '/api/balances',
      '/api/transactions',
      '/api/gas-policies'
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);
      // Should either redirect to auth or return 401/403
      expect([401, 403, 302]).toContain(response.status());
    }
  });
});

test.describe('Gasless Transaction API', () => {
  test('gasless transaction endpoint exists and handles requests', async ({ request }) => {
    // Test that the endpoint exists (will be unauthorized but should not 404)
    const response = await request.post('/api/transactions/gasless', {
      data: {
        to: '0x1234567890123456789012345678901234567890',
        value: '0',
        chainId: 56,
        walletId: 'test-wallet-id'
      }
    });
    
    // Should be unauthorized, not not found
    expect(response.status()).not.toBe(404);
    expect([401, 403, 400]).toContain(response.status());
  });
});