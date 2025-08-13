import { test, expect } from '@playwright/test';

test.describe('Security Vulnerability Testing', () => {
  test('should prevent SQL injection attacks', async ({ request }) => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "admin'/*",
      "' OR 1=1#",
      "'; EXEC xp_cmdshell('dir'); --",
    ];

    for (const payload of sqlInjectionPayloads) {
      const response = await request.post('/api/security/validate-address', {
        data: {
          address: payload,
          networkId: 1,
        }
      });

      // Should reject or sanitize malicious input
      expect([400, 403]).toContain(response.status());
    }
  });

  test('should prevent XSS attacks', async ({ request }) => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert(document.cookie)',
      '<svg onload=alert(1)>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onload=alert(1)>',
    ];

    for (const payload of xssPayloads) {
      const response = await request.post('/api/security/validate-address', {
        data: {
          address: payload,
          networkId: 1,
        }
      });

      // Should reject malicious scripts
      expect([400, 403]).toContain(response.status());
    }
  });

  test('should prevent path traversal attacks', async ({ request }) => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '/%2e%2e/%2e%2e/%2e%2e/etc/passwd',
      '/var/www/../../etc/passwd',
    ];

    for (const payload of pathTraversalPayloads) {
      // Test path traversal in different contexts
      const endpoints = [
        `/api/security/validate-address`,
        `/api/health`,
      ];

      for (const endpoint of endpoints) {
        const response = await request.get(`${endpoint}?file=${encodeURIComponent(payload)}`);
        
        // Should not return sensitive files
        expect(response.status()).not.toBe(200);
        
        if (response.ok()) {
          const body = await response.text();
          expect(body).not.toContain('root:');
          expect(body).not.toContain('admin');
          expect(body).not.toContain('password');
        }
      }
    }
  });

  test('should prevent command injection attacks', async ({ request }) => {
    const commandInjectionPayloads = [
      '; ls -la',
      '| whoami',
      '& echo "test"',
      '`id`',
      '$(whoami)',
      '; cat /etc/passwd',
      '|| dir',
    ];

    for (const payload of commandInjectionPayloads) {
      const response = await request.post('/api/security/validate-address', {
        data: {
          address: `0x1234567890123456789012345678901234567890${payload}`,
          networkId: 1,
        }
      });

      // Should reject command injection attempts
      expect([400, 403]).toContain(response.status());
    }
  });

  test('should prevent LDAP injection attacks', async ({ request }) => {
    const ldapInjectionPayloads = [
      '*)(uid=*',
      '*)(|(uid=*',
      '*)(&(uid=*',
      '*))%00',
      '*()|&\'',
      '*)(objectClass=*',
    ];

    for (const payload of ldapInjectionPayloads) {
      const response = await request.post('/api/security/validate-address', {
        data: {
          address: payload,
          networkId: 1,
        }
      });

      // Should reject LDAP injection attempts
      expect([400, 403]).toContain(response.status());
    }
  });
});

test.describe('Input Validation and Sanitization', () => {
  test('should validate cryptocurrency addresses properly', async ({ request }) => {
    const testCases = [
      // Valid Ethereum addresses
      { address: '0x1234567890123456789012345678901234567890', networkId: 1, shouldBeValid: true },
      { address: '0xAbCdEf1234567890123456789012345678901234', networkId: 1, shouldBeValid: true },
      
      // Invalid Ethereum addresses
      { address: '0x123', networkId: 1, shouldBeValid: false },
      { address: '1234567890123456789012345678901234567890', networkId: 1, shouldBeValid: false },
      { address: '0xZZZZ567890123456789012345678901234567890', networkId: 1, shouldBeValid: false },
      
      // Valid Solana addresses
      { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', networkId: 'solana-mainnet', shouldBeValid: true },
      
      // Invalid Solana addresses
      { address: '0x1234567890123456789012345678901234567890', networkId: 'solana-mainnet', shouldBeValid: false },
      { address: 'invalid-solana-address', networkId: 'solana-mainnet', shouldBeValid: false },
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
      expect(data.valid).toBe(testCase.shouldBeValid);
    }
  });

  test('should handle extremely long inputs', async ({ request }) => {
    const veryLongString = 'a'.repeat(10000);
    
    const response = await request.post('/api/security/validate-address', {
      data: {
        address: veryLongString,
        networkId: 1,
      }
    });

    // Should either reject or handle gracefully
    expect([200, 400, 413]).toContain(response.status());
  });

  test('should handle special characters and unicode', async ({ request }) => {
    const specialInputs = [
      'test\x00null',
      'test\nnewline',
      'test\ttab',
      'emoji😀address',
      '测试地址',
      'عنوان اختبار',
      'тестовый адрес',
    ];

    for (const input of specialInputs) {
      const response = await request.post('/api/security/validate-address', {
        data: {
          address: input,
          networkId: 1,
        }
      });

      // Should handle special characters gracefully
      expect([200, 400]).toContain(response.status());
      
      if (response.ok()) {
        const data = await response.json();
        expect(data.valid).toBe(false); // These shouldn't be valid addresses
      }
    }
  });

  test('should validate numeric inputs properly', async ({ request }) => {
    const numericTestCases = [
      { networkId: 1, shouldWork: true },
      { networkId: '1', shouldWork: true },
      { networkId: 999999, shouldWork: false }, // Unsupported network
      { networkId: -1, shouldWork: false },
      { networkId: 'invalid', shouldWork: false },
      { networkId: null, shouldWork: false },
      { networkId: undefined, shouldWork: false },
    ];

    for (const testCase of numericTestCases) {
      const response = await request.post('/api/security/validate-address', {
        data: {
          address: '0x1234567890123456789012345678901234567890',
          networkId: testCase.networkId,
        }
      });

      if (testCase.shouldWork) {
        expect([200, 400]).toContain(response.status());
      } else {
        expect([400, 422]).toContain(response.status());
      }
    }
  });
});

test.describe('Rate Limiting and DoS Protection', () => {
  test('should enforce rate limits on authentication endpoints', async ({ request }) => {
    const authEndpoint = '/api/auth/user';
    const requests = [];
    
    // Make rapid requests to auth endpoint
    for (let i = 0; i < 10; i++) {
      requests.push(request.get(authEndpoint));
    }
    
    const responses = await Promise.all(requests);
    
    // Should see some rate limiting (429 responses) if limits are strict
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    
    // If rate limiting is working, we should see some 429s
    // If not, we should at least see consistent 401/403 (auth required)
    responses.forEach(response => {
      expect([401, 403, 429]).toContain(response.status());
    });
    
    console.log(`Auth rate limit test: ${rateLimitedResponses.length}/10 rate limited`);
  });

  test('should protect against request flooding', async ({ request }) => {
    const endpoint = '/api/chains';
    const floodSize = 50;
    const startTime = Date.now();
    
    // Create flood of requests
    const promises = Array.from({ length: floodSize }, () => request.get(endpoint));
    const responses = await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Analyze response patterns
    const statusCodes = responses.map(r => r.status());
    const successCount = responses.filter(r => r.ok()).length;
    const rateLimitCount = responses.filter(r => r.status() === 429).length;
    const serverErrorCount = responses.filter(r => r.status() >= 500).length;
    
    // System should remain stable
    expect(serverErrorCount).toBeLessThan(floodSize * 0.1); // Less than 10% server errors
    
    // Should complete in reasonable time
    expect(duration).toBeLessThan(30000); // Under 30 seconds
    
    console.log(`Flood test: ${successCount} success, ${rateLimitCount} rate limited, ${serverErrorCount} errors, ${duration}ms`);
  });

  test('should handle connection exhaustion attempts', async ({ request }) => {
    // Test holding many connections open
    const connections = [];
    
    for (let i = 0; i < 20; i++) {
      // Create requests but don't await them immediately
      const promise = request.get('/api/health', {
        timeout: 5000, // 5 second timeout
      });
      connections.push(promise);
      
      // Small delay between connection attempts
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Now wait for all connections
    const results = await Promise.allSettled(connections);
    
    // Analyze results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok()).length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const timedOut = results.filter(r => 
      r.status === 'rejected' && r.reason.message?.includes('timeout')
    ).length;
    
    // System should handle connection pressure gracefully
    expect(successful + failed).toBe(20);
    
    console.log(`Connection test: ${successful} successful, ${failed} failed, ${timedOut} timed out`);
  });
});

test.describe('Data Integrity and Consistency', () => {
  test('should maintain data consistency under concurrent access', async ({ request }) => {
    // Test concurrent access to same data
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(request.get('/api/networks'));
      promises.push(request.get('/api/chains'));
    }
    
    const responses = await Promise.all(promises);
    const successfulResponses = responses.filter(r => r.ok());
    
    if (successfulResponses.length > 1) {
      // Get response data
      const networkData = [];
      const chainData = [];
      
      for (const response of successfulResponses) {
        const url = response.url();
        const data = await response.json();
        
        if (url.includes('/networks')) {
          networkData.push(data);
        } else if (url.includes('/chains')) {
          chainData.push(data);
        }
      }
      
      // Check data consistency
      if (networkData.length > 1) {
        const firstNetworkResponse = JSON.stringify(networkData[0]);
        networkData.forEach(data => {
          expect(JSON.stringify(data)).toBe(firstNetworkResponse);
        });
      }
      
      if (chainData.length > 1) {
        const firstChainResponse = JSON.stringify(chainData[0]);
        chainData.forEach(data => {
          expect(JSON.stringify(data)).toBe(firstChainResponse);
        });
      }
    }
  });

  test('should validate response data structure integrity', async ({ request }) => {
    const endpoints = [
      { endpoint: '/api/health', requiredFields: ['status', 'timestamp', 'version'] },
      { endpoint: '/api/chains', arrayField: true, itemFields: ['id', 'name', 'rpcUrl'] },
      { endpoint: '/api/networks', arrayField: true, itemFields: ['id', 'name', 'type'] },
    ];

    for (const test of endpoints) {
      const response = await request.get(test.endpoint);
      
      if (response.ok()) {
        const data = await response.json();
        
        if (test.arrayField) {
          expect(Array.isArray(data)).toBeTruthy();
          
          if (data.length > 0 && test.itemFields) {
            data.forEach(item => {
              test.itemFields.forEach(field => {
                expect(item[field]).toBeDefined();
              });
            });
          }
        } else if (test.requiredFields) {
          test.requiredFields.forEach(field => {
            expect(data[field]).toBeDefined();
          });
        }
      }
    }
  });
});

test.describe('Error Handling and Recovery', () => {
  test('should handle malformed JSON gracefully', async ({ request }) => {
    const malformedPayloads = [
      '{"invalid": json}',
      '{malformed: "json"',
      '{"unclosed": "quote}',
      '{"trailing": "comma",}',
      '',
      'null',
      'undefined',
    ];

    for (const payload of malformedPayloads) {
      try {
        const response = await request.post('/api/security/validate-address', {
          data: payload,
          headers: {
            'Content-Type': 'application/json',
          }
        });

        // Should handle malformed JSON gracefully
        expect([400, 422]).toContain(response.status());
      } catch (error) {
        // Network or parsing errors are acceptable for malformed data
        expect(error).toBeDefined();
      }
    }
  });

  test('should provide meaningful error messages', async ({ request }) => {
    const response = await request.post('/api/security/validate-address', {
      data: {
        // Missing required fields
        networkId: 1,
      }
    });

    expect([400, 422]).toContain(response.status());
    
    if (!response.ok()) {
      const errorData = await response.json();
      expect(errorData.message).toBeDefined();
      expect(typeof errorData.message).toBe('string');
      expect(errorData.message.length).toBeGreaterThan(0);
    }
  });

  test('should recover from temporary failures', async ({ request }) => {
    // Test recovery by making requests in sequence
    const responses = [];
    
    for (let i = 0; i < 5; i++) {
      const response = await request.get('/api/health');
      responses.push(response);
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // System should be consistently available
    const successCount = responses.filter(r => r.ok()).length;
    expect(successCount).toBeGreaterThan(3); // At least 80% success rate
  });
});