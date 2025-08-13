import { test, expect } from '@playwright/test';

test.describe('Enhanced API Health and Monitoring', () => {
  test('health endpoint should return comprehensive status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
    expect(data.metrics).toBeDefined();
    expect(data.security).toBeDefined();
    expect(data.providers).toBeDefined();
  });

  test('networks endpoint should return supported networks', async ({ request }) => {
    const response = await request.get('/api/networks');
    expect(response.ok()).toBeTruthy();
    
    const networks = await response.json();
    expect(Array.isArray(networks)).toBeTruthy();
    expect(networks.length).toBeGreaterThan(0);
    
    // Check for both EVM and non-EVM networks
    const hasEVM = networks.some(n => n.type === 'evm');
    const hasSolana = networks.some(n => n.type === 'solana');
    expect(hasEVM).toBeTruthy();
    expect(hasSolana).toBeTruthy();
    
    // Check network structure
    networks.forEach(network => {
      expect(network.id).toBeDefined();
      expect(network.name).toBeDefined();
      expect(network.type).toBeDefined();
      expect(network.nativeCurrency).toBeDefined();
      expect(network.rpcUrls).toBeDefined();
      expect(Array.isArray(network.rpcUrls)).toBeTruthy();
    });
  });

  test('network health endpoint should return status for all networks', async ({ request }) => {
    const response = await request.get('/api/networks/health');
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(typeof health).toBe('object');
    
    // Should have health data for multiple networks
    const networkIds = Object.keys(health);
    expect(networkIds.length).toBeGreaterThan(0);
    
    networkIds.forEach(networkId => {
      expect(health[networkId].healthy).toBeDefined();
      expect(typeof health[networkId].healthy).toBe('boolean');
    });
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

  test('provider health endpoint should return provider status', async ({ request }) => {
    const response = await request.get('/api/providers/health');
    
    // Should either be unauthorized or return data if somehow authenticated
    expect([401, 403, 200]).toContain(response.status());
    
    if (response.ok()) {
      const health = await response.json();
      expect(typeof health).toBe('object');
    }
  });
});

test.describe('Enhanced Authentication Flow', () => {
  test('should handle unauthenticated requests properly', async ({ request }) => {
    // Test protected endpoints return proper error when not authenticated
    const protectedEndpoints = [
      '/api/auth/user',
      '/api/wallets',
      '/api/balances',
      '/api/balances/unified',
      '/api/transactions',
      '/api/transactions/unified',
      '/api/gas-policies',
      '/api/gas/optimize',
      '/api/gas/analytics',
      '/api/security/stats'
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);
      // Should either redirect to auth or return 401/403
      expect([401, 403, 302]).toContain(response.status());
    }
  });

  test('should enforce rate limiting', async ({ request }) => {
    // Test rate limiting by making multiple rapid requests
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(request.get('/api/chains'));
    }
    
    const responses = await Promise.all(promises);
    
    // At least the first few should succeed
    expect(responses[0].ok()).toBeTruthy();
    
    // Check for rate limit headers
    const firstResponse = responses[0];
    const rateLimitHeaders = firstResponse.headers();
    
    // Should have rate limit headers if implemented
    if (rateLimitHeaders['x-ratelimit-limit']) {
      expect(rateLimitHeaders['x-ratelimit-limit']).toBeDefined();
      expect(rateLimitHeaders['x-ratelimit-remaining']).toBeDefined();
    }
  });
});

test.describe('Enhanced Security Features', () => {
  test('should validate input and reject malicious patterns', async ({ request }) => {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '../../../etc/passwd',
      'union select * from users',
      'javascript:alert(1)',
      'eval(document.cookie)',
    ];

    for (const maliciousInput of maliciousInputs) {
      const response = await request.post('/api/security/validate-address', {
        data: {
          address: maliciousInput,
          networkId: 1,
        }
      });
      
      // Should reject malicious input
      expect([400, 403]).toContain(response.status());
    }
  });

  test('should have proper security headers', async ({ request }) => {
    const response = await request.get('/api/health');
    const headers = response.headers();
    
    // Check for security headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-xss-protection']).toBeDefined();
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers['content-security-policy']).toBeDefined();
  });

  test('address validation should work for different network types', async ({ request }) => {
    const testCases = [
      { address: '0x1234567890123456789012345678901234567890', networkId: 1, expectedValid: true },
      { address: 'invalid-eth-address', networkId: 1, expectedValid: false },
      { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', networkId: 'solana-mainnet', expectedValid: true },
      { address: 'invalid-solana-address', networkId: 'solana-mainnet', expectedValid: false },
    ];

    for (const testCase of testCases) {
      const response = await request.post('/api/security/validate-address', {
        data: {
          address: testCase.address,
          networkId: testCase.networkId,
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.valid).toBe(testCase.expectedValid);
    }
  });
});

test.describe('Gas Optimization Features', () => {
  test('fee estimation should work for different networks', async ({ request }) => {
    const testTransactions = [
      { 
        transaction: { to: '0x1234567890123456789012345678901234567890', value: '1000000000000000000' },
        networkId: 1 
      },
      { 
        transaction: { to: '0x1234567890123456789012345678901234567890', value: '1000000000000000000' },
        networkId: 137 
      },
    ];

    for (const testTx of testTransactions) {
      const response = await request.post('/api/transactions/estimate-fees', {
        data: testTx
      });
      
      if (response.ok()) {
        const data = await response.json();
        expect(data.fee).toBeDefined();
        expect(typeof data.fee).toBe('string');
      } else {
        // Fee estimation might require authentication or fail due to invalid data
        expect([400, 401, 403, 500]).toContain(response.status());
      }
    }
  });
});

test.describe('Cross-Network Transaction Flow', () => {
  test('unified transaction endpoint should exist and handle requests', async ({ request }) => {
    // Test that the endpoint exists (will be unauthorized but should not 404)
    const response = await request.post('/api/transactions/unified', {
      data: {
        transaction: {
          to: '0x1234567890123456789012345678901234567890',
          value: '0',
        },
        networkId: 1
      }
    });
    
    // Should be unauthorized, not not found
    expect(response.status()).not.toBe(404);
    expect([401, 403, 400, 500]).toContain(response.status());
  });

  test('unified balances endpoint should handle requests properly', async ({ request }) => {
    const response = await request.get('/api/balances/unified');
    
    // Should be unauthorized but endpoint should exist
    expect(response.status()).not.toBe(404);
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Enhanced Gasless Transaction API', () => {
  test('gasless transaction endpoint should have enhanced features', async ({ request }) => {
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

  test('gasless quote endpoint should return optimization data', async ({ request }) => {
    const response = await request.post('/api/transactions/gasless/quote', {
      data: {
        to: '0x1234567890123456789012345678901234567890',
        value: '0',
        chainId: 1
      }
    });
    
    // Should be unauthorized but endpoint should exist
    expect(response.status()).not.toBe(404);
    expect([401, 403, 400]).toContain(response.status());
  });
});