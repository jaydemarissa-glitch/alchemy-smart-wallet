/**
 * Multi-Provider Service with Fallback Mechanisms
 * 
 * This service implements automatic failover between multiple blockchain providers
 * to ensure high availability and resilience.
 */

import { Alchemy, Network } from 'alchemy-sdk';
import { monitoringService } from './monitoringService';

interface ProviderConfig {
  name: string;
  priority: number;
  rpcUrl: string;
  apiKey?: string;
  network?: Network;
  enabled: boolean;
  healthScore: number;
  lastFailure?: number;
  consecutiveFailures: number;
}

interface ProviderHealth {
  isHealthy: boolean;
  latency: number;
  uptime: number;
  lastCheck: number;
}

export class ProviderService {
  private providers: Map<number, ProviderConfig[]> = new Map();
  private clients: Map<string, Alchemy> = new Map();
  private healthChecks: Map<string, ProviderHealth> = new Map();
  private circuitBreakers: Map<string, { isOpen: boolean; openTime: number; failures: number }> = new Map();
  
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.initializeProviders();
    this.startHealthChecking();
  }

  private initializeProviders() {
    const alchemyKey = process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY || '';
    const infuraKey = process.env.INFURA_API_KEY || '';
    const ankrKey = process.env.ANKR_API_KEY || '';
    const quicknodeEndpoint = process.env.QUICKNODE_ENDPOINT || '';

    // Define providers for each supported chain
    const chainProviders = {
      1: [ // Ethereum Mainnet
        {
          name: 'alchemy',
          priority: 1,
          rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
          apiKey: alchemyKey,
          network: Network.ETH_MAINNET,
          enabled: !!alchemyKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
        {
          name: 'infura',
          priority: 2,
          rpcUrl: `https://mainnet.infura.io/v3/${infuraKey}`,
          apiKey: infuraKey,
          enabled: !!infuraKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
        {
          name: 'ankr',
          priority: 3,
          rpcUrl: `https://rpc.ankr.com/eth/${ankrKey}`,
          apiKey: ankrKey,
          enabled: !!ankrKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
        {
          name: 'quicknode',
          priority: 4,
          rpcUrl: quicknodeEndpoint,
          enabled: !!quicknodeEndpoint,
          healthScore: 100,
          consecutiveFailures: 0,
        },
      ],
      137: [ // Polygon
        {
          name: 'alchemy',
          priority: 1,
          rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`,
          apiKey: alchemyKey,
          network: Network.MATIC_MAINNET,
          enabled: !!alchemyKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
        {
          name: 'infura',
          priority: 2,
          rpcUrl: `https://polygon-mainnet.infura.io/v3/${infuraKey}`,
          apiKey: infuraKey,
          enabled: !!infuraKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
        {
          name: 'ankr',
          priority: 3,
          rpcUrl: `https://rpc.ankr.com/polygon/${ankrKey}`,
          apiKey: ankrKey,
          enabled: !!ankrKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
      ],
      56: [ // BSC
        {
          name: 'alchemy',
          priority: 1,
          rpcUrl: `https://bnb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
          apiKey: alchemyKey,
          enabled: !!alchemyKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
        {
          name: 'ankr',
          priority: 2,
          rpcUrl: `https://rpc.ankr.com/bsc/${ankrKey}`,
          apiKey: ankrKey,
          enabled: !!ankrKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
      ],
      8453: [ // Base
        {
          name: 'alchemy',
          priority: 1,
          rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
          apiKey: alchemyKey,
          network: Network.BASE_MAINNET,
          enabled: !!alchemyKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
        {
          name: 'ankr',
          priority: 2,
          rpcUrl: `https://rpc.ankr.com/base/${ankrKey}`,
          apiKey: ankrKey,
          enabled: !!ankrKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
      ],
      42161: [ // Arbitrum
        {
          name: 'alchemy',
          priority: 1,
          rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
          apiKey: alchemyKey,
          network: Network.ARB_MAINNET,
          enabled: !!alchemyKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
        {
          name: 'infura',
          priority: 2,
          rpcUrl: `https://arbitrum-mainnet.infura.io/v3/${infuraKey}`,
          apiKey: infuraKey,
          enabled: !!infuraKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
        {
          name: 'ankr',
          priority: 3,
          rpcUrl: `https://rpc.ankr.com/arbitrum/${ankrKey}`,
          apiKey: ankrKey,
          enabled: !!ankrKey,
          healthScore: 100,
          consecutiveFailures: 0,
        },
      ],
    };

    // Initialize providers and clients
    Object.entries(chainProviders).forEach(([chainId, providers]) => {
      this.providers.set(Number(chainId), providers);
      
      providers.forEach(provider => {
        if (provider.enabled && (provider as any).network && provider.apiKey) {
          const clientKey = `${chainId}-${provider.name}`;
          try {
            const client = new Alchemy({
              apiKey: provider.apiKey,
              network: (provider as any).network,
            });
            this.clients.set(clientKey, client);
          } catch (error) {
            console.error(`Failed to initialize ${provider.name} client for chain ${chainId}:`, error);
            provider.enabled = false;
          }
        }
      });
    });
  }

  private startHealthChecking() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private async performHealthChecks() {
    for (const [chainId, providers] of Array.from(this.providers.entries())) {
      for (const provider of providers) {
        if (!provider.enabled) continue;

        const clientKey = `${chainId}-${provider.name}`;
        const startTime = Date.now();

        try {
          const client = this.clients.get(clientKey);
          if (client) {
            // Simple health check - get latest block number
            await client.core.getBlockNumber();
            const latency = Date.now() - startTime;

            // Update health metrics
            this.healthChecks.set(clientKey, {
              isHealthy: true,
              latency,
              uptime: this.calculateUptime(clientKey),
              lastCheck: Date.now(),
            });

            // Reset circuit breaker if healthy
            this.circuitBreakers.delete(clientKey);
            provider.healthScore = Math.min(100, provider.healthScore + 10);
            provider.consecutiveFailures = 0;

          }
        } catch (error) {
          this.handleProviderFailure(provider, clientKey, error);
        }
      }
    }
  }

  private handleProviderFailure(provider: ProviderConfig, clientKey: string, error: any) {
    provider.consecutiveFailures++;
    provider.healthScore = Math.max(0, provider.healthScore - 20);
    provider.lastFailure = Date.now();

    // Update circuit breaker
    const circuitBreaker = this.circuitBreakers.get(clientKey) || { isOpen: false, openTime: 0, failures: 0 };
    circuitBreaker.failures++;

    if (circuitBreaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreaker.isOpen = true;
      circuitBreaker.openTime = Date.now();
      
      monitoringService.logSecurityEvent({
        type: 'suspicious_transaction',
        details: {
          providerName: provider.name,
          reason: 'Circuit breaker opened due to consecutive failures',
          failures: circuitBreaker.failures,
        },
        severity: 'high',
      });
    }

    this.circuitBreakers.set(clientKey, circuitBreaker);

    // Update health status
    this.healthChecks.set(clientKey, {
      isHealthy: false,
      latency: -1,
      uptime: this.calculateUptime(clientKey),
      lastCheck: Date.now(),
    });

    console.error(`Provider ${provider.name} health check failed:`, error.message);
  }

  private calculateUptime(clientKey: string): number {
    // This is a simplified uptime calculation
    // In production, you'd want to track this over time
    const health = this.healthChecks.get(clientKey);
    return health?.isHealthy ? 99.9 : 95.0;
  }

  private isCircuitBreakerOpen(clientKey: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(clientKey);
    if (!circuitBreaker || !circuitBreaker.isOpen) return false;

    // Check if circuit breaker timeout has passed
    if (Date.now() - circuitBreaker.openTime > this.CIRCUIT_BREAKER_TIMEOUT) {
      // Half-open state - allow one request to test
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = 0;
      this.circuitBreakers.set(clientKey, circuitBreaker);
      return false;
    }

    return true;
  }

  private getSortedProviders(chainId: number): ProviderConfig[] {
    const providers = this.providers.get(chainId) || [];
    return providers
      .filter(p => p.enabled)
      .sort((a, b) => {
        // Sort by health score first, then priority
        if (a.healthScore !== b.healthScore) {
          return b.healthScore - a.healthScore;
        }
        return a.priority - b.priority;
      });
  }

  async getClientWithFallback(chainId: number): Promise<{ client: Alchemy; providerName: string } | null> {
    const providers = this.getSortedProviders(chainId);
    
    for (const provider of providers) {
      const clientKey = `${chainId}-${provider.name}`;
      
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(clientKey)) {
        continue;
      }

      const client = this.clients.get(clientKey);
      if (client) {
        return { client, providerName: provider.name };
      }
    }

    return null;
  }

  async executeWithFallback<T>(
    chainId: number,
    operation: (client: Alchemy) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const providers = this.getSortedProviders(chainId);
    let lastError: Error | null = null;

    for (const provider of providers) {
      const clientKey = `${chainId}-${provider.name}`;
      
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(clientKey)) {
        continue;
      }

      const client = this.clients.get(clientKey);
      if (!client) continue;

      let retryCount = 0;
      while (retryCount <= this.MAX_RETRY_ATTEMPTS) {
        try {
          const startTime = Date.now();
          const result = await operation(client);
          const duration = Date.now() - startTime;

          // Log successful operation
          console.log(`${operationName} succeeded via ${provider.name} in ${duration}ms`);
          
          // Update provider health
          provider.healthScore = Math.min(100, provider.healthScore + 5);
          provider.consecutiveFailures = 0;

          return result;
        } catch (error) {
          lastError = error as Error;
          retryCount++;

          if (retryCount <= this.MAX_RETRY_ATTEMPTS) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          } else {
            // Mark provider as unhealthy after max retries
            this.handleProviderFailure(provider, clientKey, error);
          }
        }
      }
    }

    // All providers failed
    monitoringService.logSecurityEvent({
      type: 'suspicious_transaction',
      details: {
        operation: operationName,
        chainId,
        reason: 'All providers failed',
        lastError: lastError?.message,
      },
      severity: 'critical',
    });

    throw lastError || new Error(`All providers failed for chain ${chainId}`);
  }

  getProviderHealth(chainId?: number): Record<string, any> {
    if (chainId) {
      const providers = this.providers.get(chainId) || [];
      return providers.map(provider => {
        const clientKey = `${chainId}-${provider.name}`;
        const health = this.healthChecks.get(clientKey);
        const circuitBreaker = this.circuitBreakers.get(clientKey);
        
        return {
          name: provider.name,
          enabled: provider.enabled,
          healthScore: provider.healthScore,
          consecutiveFailures: provider.consecutiveFailures,
          isHealthy: health?.isHealthy ?? false,
          latency: health?.latency ?? -1,
          uptime: health?.uptime ?? 0,
          circuitBreakerOpen: circuitBreaker?.isOpen ?? false,
        };
      });
    }

    // Return health for all chains
    const allHealth: Record<string, any> = {};
    for (const [chainId, providers] of Array.from(this.providers.entries())) {
      allHealth[chainId] = this.getProviderHealth(chainId);
    }
    return allHealth;
  }
}

export const providerService = new ProviderService();