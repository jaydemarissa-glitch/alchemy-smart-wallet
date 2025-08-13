import { test, expect } from '@playwright/test';

test.describe('Stress Testing - High Load Scenarios', () => {
  test('should handle concurrent API requests', async ({ request }) => {
    const concurrentRequests = 20;
    const endpoint = '/api/chains';
    
    const startTime = Date.now();
    const promises = Array.from({ length: concurrentRequests }, () => 
      request.get(endpoint)
    );
    
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Check that most requests succeeded
    const successCount = responses.filter(r => r.ok()).length;
    expect(successCount).toBeGreaterThan(concurrentRequests * 0.8); // At least 80% success
    
    // Check response time is reasonable
    expect(totalTime).toBeLessThan(30000); // Under 30 seconds for all requests
    
    console.log(`Concurrent requests: ${concurrentRequests}, Success rate: ${successCount}/${concurrentRequests}, Total time: ${totalTime}ms`);
  });

  test('should handle rapid sequential requests', async ({ request }) => {
    const requestCount = 50;
    const responses = [];
    
    const startTime = Date.now();
    
    for (let i = 0; i < requestCount; i++) {
      const response = await request.get('/api/health');
      responses.push(response);
      
      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgResponseTime = totalTime / requestCount;
    
    // Check success rate
    const successCount = responses.filter(r => r.ok()).length;
    expect(successCount).toBeGreaterThan(requestCount * 0.9); // At least 90% success
    
    // Check average response time
    expect(avgResponseTime).toBeLessThan(1000); // Under 1 second average
    
    console.log(`Sequential requests: ${requestCount}, Success rate: ${successCount}/${requestCount}, Avg response time: ${avgResponseTime}ms`);
  });

  test('should handle large payload requests', async ({ request }) => {
    // Create a large but reasonable payload
    const largePayload = {
      data: 'x'.repeat(10000), // 10KB of data
      metadata: {
        description: 'Large payload stress test',
        timestamp: Date.now(),
        version: '1.0.0',
      },
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 1000,
      })),
    };
    
    const response = await request.post('/api/security/validate-address', {
      data: {
        address: '0x1234567890123456789012345678901234567890',
        networkId: 1,
        ...largePayload,
      }
    });
    
    // Should handle large payload gracefully
    expect([200, 400, 413]).toContain(response.status());
    
    if (response.status() === 413) {
      console.log('Large payload rejected (expected behavior)');
    } else {
      console.log('Large payload processed successfully');
    }
  });

  test('should maintain performance under memory pressure', async ({ request }) => {
    // Simulate memory pressure by making many requests with different data
    const requests = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      const promise = request.post('/api/security/validate-address', {
        data: {
          address: `0x${i.toString(16).padStart(40, '0')}`,
          networkId: Math.floor(Math.random() * 5) + 1,
          batch: i,
          timestamp: Date.now(),
        }
      });
      requests.push(promise);
      
      // Add small delay every 10 requests
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    // Check that system remained responsive
    const successfulResponses = responses.filter(r => r.status() < 500).length;
    expect(successfulResponses).toBeGreaterThan(80); // Most should not be server errors
    
    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds
    
    console.log(`Memory pressure test: ${successfulResponses}/100 successful, ${totalTime}ms total`);
  });
});

test.describe('Network Congestion Simulation', () => {
  test('should handle network timeouts gracefully', async ({ request }) => {
    // Test with a very short timeout to simulate network issues
    const shortTimeoutRequests = [];
    
    for (let i = 0; i < 5; i++) {
      const promise = request.get('/api/networks/health', {
        timeout: 100, // Very short timeout
      }).catch(error => ({ 
        ok: () => false, 
        status: () => 408, 
        error: error.message 
      }));
      
      shortTimeoutRequests.push(promise);
    }
    
    const responses = await Promise.all(shortTimeoutRequests);
    
    // Some requests might timeout, but system should handle it gracefully
    console.log(`Network timeout simulation: ${responses.length} requests processed`);
    
    // Verify we don't get unexpected errors
    responses.forEach(response => {
      if (typeof response.status === 'function') {
        expect([200, 408, 500, 503]).toContain(response.status());
      }
    });
  });

  test('should handle provider failover scenarios', async ({ request }) => {
    // Test provider health endpoint which should show failover capabilities
    const response = await request.get('/api/providers/health?chainId=1');
    
    if (response.ok()) {
      const healthData = await response.json();
      
      // Should have multiple providers for resilience
      if (Array.isArray(healthData)) {
        expect(healthData.length).toBeGreaterThan(1);
        
        // Check provider diversity
        const providerNames = healthData.map(p => p.name);
        const uniqueProviders = new Set(providerNames);
        expect(uniqueProviders.size).toBeGreaterThan(1);
        
        console.log(`Provider diversity: ${uniqueProviders.size} unique providers`);
      }
    } else {
      // If not authenticated, that's expected
      expect([401, 403]).toContain(response.status());
    }
  });
});

test.describe('Real-world Usage Patterns', () => {
  test('should handle typical user workflow patterns', async ({ request }) => {
    // Simulate a typical user session
    const workflow = [
      () => request.get('/api/health'),
      () => request.get('/api/chains'),
      () => request.get('/api/networks'),
      () => request.get('/api/networks/health'),
      () => request.post('/api/security/validate-address', {
        data: { address: '0x1234567890123456789012345678901234567890', networkId: 1 }
      }),
      () => request.post('/api/transactions/estimate-fees', {
        data: { 
          transaction: { to: '0x1234567890123456789012345678901234567890', value: '1000000000000000000' },
          networkId: 1 
        }
      }),
    ];
    
    const results = [];
    
    for (const step of workflow) {
      const startTime = Date.now();
      try {
        const response = await step();
        const duration = Date.now() - startTime;
        results.push({
          success: response.ok() || [401, 403].includes(response.status()),
          duration,
          status: response.status(),
        });
      } catch (error) {
        results.push({
          success: false,
          duration: Date.now() - startTime,
          error: error.message,
        });
      }
      
      // Realistic delay between actions
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    }
    
    // Analyze workflow results
    const successfulSteps = results.filter(r => r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    expect(successfulSteps).toBeGreaterThan(workflow.length * 0.8);
    expect(avgDuration).toBeLessThan(5000); // Average under 5 seconds per step
    
    console.log(`Workflow completion: ${successfulSteps}/${workflow.length} steps, avg ${avgDuration}ms per step`);
  });

  test('should handle burst traffic patterns', async ({ request }) => {
    // Simulate burst traffic - quiet periods followed by high activity
    const results = [];
    
    // Burst 1: High activity
    const burst1 = Array.from({ length: 20 }, () => request.get('/api/health'));
    const burst1Results = await Promise.all(burst1);
    results.push(...burst1Results);
    
    // Quiet period
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Burst 2: Different endpoint
    const burst2 = Array.from({ length: 15 }, () => request.get('/api/chains'));
    const burst2Results = await Promise.all(burst2);
    results.push(...burst2Results);
    
    // Quiet period
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Burst 3: Mixed endpoints
    const burst3 = [];
    for (let i = 0; i < 10; i++) {
      const endpoint = i % 2 === 0 ? '/api/health' : '/api/networks';
      burst3.push(request.get(endpoint));
    }
    const burst3Results = await Promise.all(burst3);
    results.push(...burst3Results);
    
    // Analyze burst handling
    const successCount = results.filter(r => r.ok()).length;
    const successRate = successCount / results.length;
    
    expect(successRate).toBeGreaterThan(0.85); // 85% success rate
    
    console.log(`Burst traffic test: ${successCount}/${results.length} successful (${(successRate * 100).toFixed(1)}%)`);
  });
});

test.describe('Performance Monitoring', () => {
  test('should track response times consistently', async ({ request }) => {
    const measurements = [];
    const testEndpoint = '/api/chains';
    
    // Take multiple measurements
    for (let i = 0; i < 20; i++) {
      const startTime = Date.now();
      const response = await request.get(testEndpoint);
      const duration = Date.now() - startTime;
      
      measurements.push({
        duration,
        success: response.ok(),
        status: response.status(),
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Analyze performance consistency
    const durations = measurements.filter(m => m.success).map(m => m.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    // Performance expectations
    expect(avgDuration).toBeLessThan(2000); // Average under 2 seconds
    expect(maxDuration).toBeLessThan(10000); // Max under 10 seconds
    expect(maxDuration - minDuration).toBeLessThan(5000); // Reasonable variance
    
    console.log(`Performance stats - Avg: ${avgDuration}ms, Min: ${minDuration}ms, Max: ${maxDuration}ms`);
  });

  test('should maintain performance under different load levels', async ({ request }) => {
    const loadLevels = [1, 5, 10, 15];
    const results = [];
    
    for (const load of loadLevels) {
      const startTime = Date.now();
      const promises = Array.from({ length: load }, () => request.get('/api/health'));
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      const successCount = responses.filter(r => r.ok()).length;
      const avgTime = totalTime / load;
      
      results.push({
        load,
        successCount,
        avgTime,
        successRate: successCount / load,
      });
      
      // Cool down between load tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Analyze scalability
    results.forEach((result, index) => {
      expect(result.successRate).toBeGreaterThan(0.8); // 80% success at all load levels
      
      if (index > 0) {
        // Response time shouldn't degrade too much with increased load
        const prevResult = results[index - 1];
        const performanceDegradation = result.avgTime / prevResult.avgTime;
        expect(performanceDegradation).toBeLessThan(3); // No more than 3x slower
      }
      
      console.log(`Load ${result.load}: ${result.successCount}/${result.load} success, ${result.avgTime}ms avg`);
    });
  });
});