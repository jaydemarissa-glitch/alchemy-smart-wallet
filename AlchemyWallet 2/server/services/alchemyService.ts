import { Alchemy, Network } from 'alchemy-sdk';
import memoize from 'memoizee';

// Enhanced chain configurations with additional metadata
export const SUPPORTED_CHAINS = {
  1: { 
    name: 'Ethereum', 
    network: Network.ETH_MAINNET, 
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://etherscan.io',
    averageBlockTime: 12000, // 12 seconds
  },
  56: { 
    name: 'BSC', 
    network: null, 
    rpcUrl: 'https://bnb-mainnet.g.alchemy.com/v2/',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorerUrl: 'https://bscscan.com',
    averageBlockTime: 3000, // 3 seconds
  },
  137: { 
    name: 'Polygon', 
    network: Network.MATIC_MAINNET, 
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrl: 'https://polygonscan.com',
    averageBlockTime: 2000, // 2 seconds
  },
  8453: { 
    name: 'Base', 
    network: Network.BASE_MAINNET, 
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://basescan.org',
    averageBlockTime: 2000, // 2 seconds
  },
  42161: { 
    name: 'Arbitrum', 
    network: Network.ARB_MAINNET, 
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://arbiscan.io',
    averageBlockTime: 1000, // 1 second
  },
} as const;

export type SupportedChainId = keyof typeof SUPPORTED_CHAINS;

// Error types for better error handling
export class AlchemyServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly chainId?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'AlchemyServiceError';
  }
}

export class UnsupportedChainError extends AlchemyServiceError {
  constructor(chainId: number) {
    super(`Unsupported chain ID: ${chainId}`, 'UNSUPPORTED_CHAIN', chainId);
    this.name = 'UnsupportedChainError';
  }
}

export class ClientNotAvailableError extends AlchemyServiceError {
  constructor(chainId: number) {
    super(`No Alchemy client available for chain ${chainId}`, 'CLIENT_NOT_AVAILABLE', chainId);
    this.name = 'ClientNotAvailableError';
  }
}

export class InvalidApiKeyError extends AlchemyServiceError {
  constructor() {
    super('ALCHEMY_API_KEY is required', 'INVALID_API_KEY');
    this.name = 'InvalidApiKeyError';
  }
}

// Configuration interface
export interface AlchemyServiceConfig {
  apiKey?: string;
  maxRetries?: number;
  retryDelay?: number;
  cacheTimeout?: number;
  enableRequestLogging?: boolean;
}

// Enhanced return types
export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string;
}

export interface TokenMetadata {
  name?: string | null;
  symbol?: string | null;
  decimals?: number | null;
  logo?: string | null;
}

export interface ChainInfo {
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
  averageBlockTime: number;
  hasAlchemySupport: boolean;
}

class AlchemyService {
  private clients: Map<number, Alchemy> = new Map();
  private readonly apiKey: string;
  private readonly config: Required<AlchemyServiceConfig>;
  private readonly requestCache: Map<string, any> = new Map();
  private cacheCleanupInterval?: NodeJS.Timeout;

  constructor(config: AlchemyServiceConfig = {}) {
    this.apiKey = config.apiKey || process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY || '';
    
    if (!this.apiKey) {
      throw new InvalidApiKeyError();
    }
    
    // Merge with default configuration
    this.config = {
      apiKey: this.apiKey,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      cacheTimeout: config.cacheTimeout ?? 30000, // 30 seconds
      enableRequestLogging: config.enableRequestLogging ?? false,
    };
    
    this.initializeClients();
    this.setupCacheCleanup();
  }

  /**
   * Initialize Alchemy clients for all supported chains
   */
  private initializeClients(): void {
    Object.entries(SUPPORTED_CHAINS).forEach(([chainId, config]) => {
      if (config.network) {
        try {
          const alchemy = new Alchemy({
            apiKey: this.apiKey,
            network: config.network,
          });
          this.clients.set(Number(chainId), alchemy);
          
          if (this.config.enableRequestLogging) {
            console.log(`Initialized Alchemy client for ${config.name} (Chain ID: ${chainId})`);
          }
        } catch (error) {
          console.error(`Failed to initialize Alchemy client for chain ${chainId}:`, error);
        }
      }
    });
  }

  /**
   * Set up periodic cache cleanup to prevent memory leaks
   */
  private setupCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      this.requestCache.clear();
    }, this.config.cacheTimeout * 2);
  }

  /**
   * Validate if a chain is supported
   */
  private validateChainId(chainId: number): void {
    if (!(chainId in SUPPORTED_CHAINS)) {
      throw new UnsupportedChainError(chainId);
    }
  }

  /**
   * Get Alchemy client for a specific chain
   */
  getClient(chainId: number): Alchemy {
    this.validateChainId(chainId);
    
    const client = this.clients.get(chainId);
    if (!client) {
      throw new ClientNotAvailableError(chainId);
    }
    
    return client;
  }

  /**
   * Get RPC URL for a specific chain
   */
  getRpcUrl(chainId: number): string {
    this.validateChainId(chainId);
    
    const config = SUPPORTED_CHAINS[chainId as SupportedChainId];
    return config.rpcUrl + this.apiKey;
  }

  /**
   * Get chain information
   */
  getChainInfo(chainId: number): ChainInfo {
    this.validateChainId(chainId);
    
    const config = SUPPORTED_CHAINS[chainId as SupportedChainId];
    return {
      chainId,
      name: config.name,
      nativeCurrency: config.nativeCurrency,
      blockExplorerUrl: config.blockExplorerUrl,
      averageBlockTime: config.averageBlockTime,
      hasAlchemySupport: config.network !== null,
    };
  }

  /**
   * Get all supported chains
   */
  getSupportedChains(): ChainInfo[] {
    return Object.keys(SUPPORTED_CHAINS)
      .map(chainId => this.getChainInfo(Number(chainId)));
  }

  /**
   * Generic retry mechanism for API calls
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    chainId?: number
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (this.config.enableRequestLogging && attempt > 1) {
          console.log(`${context} succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === this.config.maxRetries) {
          break;
        }
        
        if (this.config.enableRequestLogging) {
          console.warn(`${context} failed on attempt ${attempt}, retrying...`, error);
        }
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt - 1))
        );
      }
    }
    
    throw new AlchemyServiceError(
      `${context} failed after ${this.config.maxRetries} attempts`,
      'MAX_RETRIES_EXCEEDED',
      chainId,
      lastError
    );
  }

  /**
   * Generate cache key for request caching
   */
  private getCacheKey(method: string, params: any[]): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  /**
   * Execute cached request
   */
  private async cachedRequest<T>(
    method: string,
    params: any[],
    operation: () => Promise<T>
  ): Promise<T> {
    const cacheKey = this.getCacheKey(method, params);
    
    if (this.requestCache.has(cacheKey)) {
      if (this.config.enableRequestLogging) {
        console.log(`Cache hit for ${method}`);
      }
      return this.requestCache.get(cacheKey);
    }
    
    const result = await operation();
    this.requestCache.set(cacheKey, result);
    
    // Set cache expiration
    setTimeout(() => {
      this.requestCache.delete(cacheKey);
    }, this.config.cacheTimeout);
    
    return result;
  }

  /**
   * Get token balances for an address
   */
  async getTokenBalances(address: string, chainId: number): Promise<any> {
    this.validateChainId(chainId);
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new AlchemyServiceError('Invalid Ethereum address', 'INVALID_ADDRESS', chainId);
    }
    
    const client = this.getClient(chainId);
    
    return this.withRetry(
      () => this.cachedRequest(
        'getTokenBalances',
        [address, chainId],
        () => client.core.getTokenBalances(address)
      ),
      `Getting token balances for ${address} on chain ${chainId}`,
      chainId
    );
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(contractAddress: string, chainId: number): Promise<TokenMetadata> {
    this.validateChainId(chainId);
    
    if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      throw new AlchemyServiceError('Invalid contract address', 'INVALID_CONTRACT_ADDRESS', chainId);
    }
    
    const client = this.getClient(chainId);
    
    return this.withRetry(
      () => this.cachedRequest(
        'getTokenMetadata',
        [contractAddress, chainId],
        () => client.core.getTokenMetadata(contractAddress)
      ),
      `Getting token metadata for ${contractAddress} on chain ${chainId}`,
      chainId
    );
  }

  /**
   * Get transaction details
   */
  async getTransaction(hash: string, chainId: number): Promise<any> {
    this.validateChainId(chainId);
    
    if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      throw new AlchemyServiceError('Invalid transaction hash', 'INVALID_TRANSACTION_HASH', chainId);
    }
    
    const client = this.getClient(chainId);
    
    return this.withRetry(
      () => client.core.getTransaction(hash),
      `Getting transaction ${hash} on chain ${chainId}`,
      chainId
    );
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: string, chainId: number): Promise<any> {
    this.validateChainId(chainId);
    
    if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      throw new AlchemyServiceError('Invalid transaction hash', 'INVALID_TRANSACTION_HASH', chainId);
    }
    
    const client = this.getClient(chainId);
    
    return this.withRetry(
      () => client.core.getTransactionReceipt(hash),
      `Getting transaction receipt ${hash} on chain ${chainId}`,
      chainId
    );
  }

  /**
   * Get current gas price
   */
  async getGasPrice(chainId: number): Promise<any> {
    this.validateChainId(chainId);
    
    const client = this.getClient(chainId);
    
    return this.withRetry(
      () => this.cachedRequest(
        'getGasPrice',
        [chainId],
        () => client.core.getGasPrice()
      ),
      `Getting gas price for chain ${chainId}`,
      chainId
    );
  }

  /**
   * Get native token balance
   */
  async getNativeBalance(address: string, chainId: number): Promise<any> {
    this.validateChainId(chainId);
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new AlchemyServiceError('Invalid Ethereum address', 'INVALID_ADDRESS', chainId);
    }
    
    const client = this.getClient(chainId);
    
    return this.withRetry(
      () => this.cachedRequest(
        'getNativeBalance',
        [address, chainId],
        () => client.core.getBalance(address)
      ),
      `Getting native balance for ${address} on chain ${chainId}`,
      chainId
    );
  }

  /**
   * Get block number
   */
  async getBlockNumber(chainId: number): Promise<number> {
    this.validateChainId(chainId);
    
    const client = this.getClient(chainId);
    
    return this.withRetry(
      () => client.core.getBlockNumber(),
      `Getting block number for chain ${chainId}`,
      chainId
    );
  }

  /**
   * Get estimated gas for a transaction
   */
  async estimateGas(transaction: any, chainId: number): Promise<any> {
    this.validateChainId(chainId);
    
    if (!transaction || typeof transaction !== 'object') {
      throw new AlchemyServiceError('Invalid transaction object', 'INVALID_TRANSACTION', chainId);
    }
    
    const client = this.getClient(chainId);
    
    return this.withRetry(
      () => client.core.estimateGas(transaction),
      `Estimating gas for transaction on chain ${chainId}`,
      chainId
    );
  }

  /**
   * Get multiple token balances efficiently
   */
  async getMultipleTokenBalances(
    addresses: string[], 
    chainId: number
  ): Promise<{ [address: string]: any }> {
    this.validateChainId(chainId);
    
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new AlchemyServiceError('Invalid addresses array', 'INVALID_ADDRESSES', chainId);
    }
    
    // Validate all addresses
    for (const address of addresses) {
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new AlchemyServiceError(`Invalid address: ${address}`, 'INVALID_ADDRESS', chainId);
      }
    }
    
    const results: { [address: string]: any } = {};
    
    // Process addresses in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(async (address) => {
        try {
          const balances = await this.getTokenBalances(address, chainId);
          return { address, balances };
        } catch (error) {
          console.error(`Error getting balances for ${address}:`, error);
          return { address, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { address, balances, error } = result.value;
          results[address] = error ? { error } : balances;
        }
      });
    }
    
    return results;
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: string; chains: { [chainId: number]: boolean } }> {
    const chainStatus: { [chainId: number]: boolean } = {};
    
    // Only check chains that have Alchemy support (have clients)
    const supportedChainIds = Array.from(this.clients.keys());
    
    const healthChecks = supportedChainIds.map(async (chainId) => {
      try {
        await this.getBlockNumber(chainId);
        chainStatus[chainId] = true;
      } catch (error) {
        chainStatus[chainId] = false;
      }
    });
    
    await Promise.allSettled(healthChecks);
    
    const allHealthy = Object.values(chainStatus).every(status => status);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      chains: chainStatus,
    };
  }

  /**
   * Get service statistics
   */
  getStats(): {
    supportedChains: number;
    activeClients: number;
    cacheSize: number;
    config: {
      maxRetries: number;
      retryDelay: number;
      cacheTimeout: number;
      enableRequestLogging: boolean;
    };
  } {
    return {
      supportedChains: Object.keys(SUPPORTED_CHAINS).length,
      activeClients: this.clients.size,
      cacheSize: this.requestCache.size,
      config: {
        maxRetries: this.config.maxRetries,
        retryDelay: this.config.retryDelay,
        cacheTimeout: this.config.cacheTimeout,
        enableRequestLogging: this.config.enableRequestLogging,
      },
    };
  }

  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearCache();
    this.clients.clear();
    
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = undefined;
    }
  }

  // Deprecated methods for backward compatibility - use gaslessCashService instead
  /**
   * @deprecated Use gaslessCashService.getGaslessQuote instead
   */
  async checkGasSponsorship(userId: string, chainId: number, estimatedGas: string): Promise<any> {
    console.warn('checkGasSponsorship is deprecated, use gaslessCashService.getGaslessQuote');
    
    return {
      canSponsor: true,
      remainingBudget: 1000,
      estimatedCost: parseFloat(estimatedGas) * 0.00001,
    };
  }

  /**
   * @deprecated Use gaslessCashService.submitGaslessTransaction instead
   */
  async sponsorTransaction(transactionData: any, userId: string, chainId: number): Promise<any> {
    console.warn('sponsorTransaction is deprecated, use gaslessCashService.submitGaslessTransaction');
    
    return {
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      sponsored: true,
      chainId,
    };
  }
}

// Memoized service instance for better performance
const createAlchemyService = memoize(
  (config?: AlchemyServiceConfig) => new AlchemyService(config),
  { primitive: true }
// Service factory function
const createAlchemyService = (config?: AlchemyServiceConfig) => new AlchemyService(config);

export const alchemyService = createAlchemyService();
export { AlchemyService };
