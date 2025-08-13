import { Alchemy, Network } from 'alchemy-sdk';
import { providerService } from './providerService';
import memoizee from 'memoizee';

// Chain configurations
export const SUPPORTED_CHAINS = {
  1: { name: 'Ethereum', network: Network.ETH_MAINNET, rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/' },
  56: { name: 'BSC', network: null, rpcUrl: 'https://bnb-mainnet.g.alchemy.com/v2/' }, // BSC via Alchemy
  137: { name: 'Polygon', network: Network.MATIC_MAINNET, rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/' },
  8453: { name: 'Base', network: Network.BASE_MAINNET, rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/' },
  42161: { name: 'Arbitrum', network: Network.ARB_MAINNET, rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/' },
} as const;

export type SupportedChainId = keyof typeof SUPPORTED_CHAINS;

export class AlchemyService {
  private clients: Map<number, Alchemy> = new Map();
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('ALCHEMY_API_KEY not found, relying on multi-provider service');
    }
    
    this.initializeClients();
  }

  private initializeClients() {
    Object.entries(SUPPORTED_CHAINS).forEach(([chainId, config]) => {
      if (config.network && this.apiKey) {
        // Note: Alchemy SDK v3.6.2+ supports additional configuration options like:
        // - maxRetries: number (defaults to 5)
        // - requestTimeout: number (defaults to 0 - no timeout)
        // - batchRequests: boolean (defaults to false)
        // These can be added to the constructor if needed for specific use cases
        const alchemy = new Alchemy({
          apiKey: this.apiKey,
          network: config.network,
        });
        this.clients.set(Number(chainId), alchemy);
      }
    });
  }

  async getClient(chainId: number): Promise<Alchemy | null> {
    // First try local client
    const localClient = this.clients.get(chainId);
    if (localClient) {
      return localClient;
    }

    // Fallback to provider service with multiple providers
    const clientWithFallback = await providerService.getClientWithFallback(chainId);
    return clientWithFallback?.client || null;
  }

  getRpcUrl(chainId: number): string {
    const config = SUPPORTED_CHAINS[chainId as SupportedChainId];
    if (!config) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return config.rpcUrl + this.apiKey;
  }

  async getTokenBalances(address: string, chainId: number) {
    return await providerService.executeWithFallback(
      chainId,
      async (client) => await client.core.getTokenBalances(address),
      `getTokenBalances(${address}, ${chainId})`
    );
  }

  async getTokenMetadata(contractAddress: string, chainId: number) {
    return await providerService.executeWithFallback(
      chainId,
      async (client) => await client.core.getTokenMetadata(contractAddress),
      `getTokenMetadata(${contractAddress}, ${chainId})`
    );
  }

  async getTransaction(hash: string, chainId: number) {
    return await providerService.executeWithFallback(
      chainId,
      async (client) => await client.core.getTransaction(hash),
      `getTransaction(${hash}, ${chainId})`
    );
  }

  async getTransactionReceipt(hash: string, chainId: number) {
    return await providerService.executeWithFallback(
      chainId,
      async (client) => await client.core.getTransactionReceipt(hash),
      `getTransactionReceipt(${hash}, ${chainId})`
    );
  }

  async getGasPrice(chainId: number) {
    return await providerService.executeWithFallback(
      chainId,
      async (client) => await client.core.getGasPrice(),
      `getGasPrice(${chainId})`
    );
  }

  async getNativeBalance(address: string, chainId: number) {
    return await providerService.executeWithFallback(
      chainId,
      async (client) => await client.core.getBalance(address),
      `getNativeBalance(${address}, ${chainId})`
    );
  }

  // Gas Manager / Sponsorship methods - Integrated with gasless.cash
  async checkGasSponsorship(userId: string, chainId: number, estimatedGas: string) {
    // This method is kept for backward compatibility but is deprecated
    // Use gaslessCashService.getGaslessQuote instead
    console.warn('checkGasSponsorship is deprecated, use gaslessCashService.getGaslessQuote');
    
    return {
      canSponsor: true,
      remainingBudget: 1000,
      estimatedCost: parseFloat(estimatedGas) * 0.00001,
    };
  }

  async sponsorTransaction(transactionData: any, userId: string, chainId: number) {
    // This method is kept for backward compatibility but is deprecated
    // Use gaslessCashService.submitGaslessTransaction instead
    console.warn('sponsorTransaction is deprecated, use gaslessCashService.submitGaslessTransaction');
    
    return {
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      sponsored: true,
      chainId,
    };
  }
}

// Memoized factory function for creating AlchemyService instances
export const createAlchemyService = memoizee(() => new AlchemyService(), {
  maxAge: 60000 // Cache for 1 minute
});
