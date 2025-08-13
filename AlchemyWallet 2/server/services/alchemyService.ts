import { Alchemy, Network } from 'alchemy-sdk';

// Chain configurations
export const SUPPORTED_CHAINS = {
  1: { name: 'Ethereum', network: Network.ETH_MAINNET, rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/' },
  56: { name: 'BSC', network: null, rpcUrl: 'https://bnb-mainnet.g.alchemy.com/v2/' }, // BSC via Alchemy
  137: { name: 'Polygon', network: Network.MATIC_MAINNET, rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/' },
  8453: { name: 'Base', network: Network.BASE_MAINNET, rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/' },
  42161: { name: 'Arbitrum', network: Network.ARB_MAINNET, rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/' },
} as const;

export type SupportedChainId = keyof typeof SUPPORTED_CHAINS;

class AlchemyService {
  private clients: Map<number, Alchemy> = new Map();
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ALCHEMY_API_KEY || process.env.VITE_ALCHEMY_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('ALCHEMY_API_KEY is required');
    }
    
    this.initializeClients();
  }

  private initializeClients() {
    Object.entries(SUPPORTED_CHAINS).forEach(([chainId, config]) => {
      if (config.network) {
        const alchemy = new Alchemy({
          apiKey: this.apiKey,
          network: config.network,
        });
        this.clients.set(Number(chainId), alchemy);
      }
    });
  }

  getClient(chainId: number): Alchemy | null {
    return this.clients.get(chainId) || null;
  }

  getRpcUrl(chainId: number): string {
    const config = SUPPORTED_CHAINS[chainId as SupportedChainId];
    if (!config) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return config.rpcUrl + this.apiKey;
  }

  async getTokenBalances(address: string, chainId: number) {
    const client = this.getClient(chainId);
    if (!client) {
      throw new Error(`No Alchemy client available for chain ${chainId}`);
    }

    try {
      const balances = await client.core.getTokenBalances(address);
      return balances;
    } catch (error) {
      console.error(`Error fetching token balances for ${address} on chain ${chainId}:`, error);
      throw error;
    }
  }

  async getTokenMetadata(contractAddress: string, chainId: number) {
    const client = this.getClient(chainId);
    if (!client) {
      throw new Error(`No Alchemy client available for chain ${chainId}`);
    }

    try {
      const metadata = await client.core.getTokenMetadata(contractAddress);
      return metadata;
    } catch (error) {
      console.error(`Error fetching token metadata for ${contractAddress} on chain ${chainId}:`, error);
      throw error;
    }
  }

  async getTransaction(hash: string, chainId: number) {
    const client = this.getClient(chainId);
    if (!client) {
      throw new Error(`No Alchemy client available for chain ${chainId}`);
    }

    try {
      const tx = await client.core.getTransaction(hash);
      return tx;
    } catch (error) {
      console.error(`Error fetching transaction ${hash} on chain ${chainId}:`, error);
      throw error;
    }
  }

  async getTransactionReceipt(hash: string, chainId: number) {
    const client = this.getClient(chainId);
    if (!client) {
      throw new Error(`No Alchemy client available for chain ${chainId}`);
    }

    try {
      const receipt = await client.core.getTransactionReceipt(hash);
      return receipt;
    } catch (error) {
      console.error(`Error fetching transaction receipt ${hash} on chain ${chainId}:`, error);
      throw error;
    }
  }

  async getGasPrice(chainId: number) {
    const client = this.getClient(chainId);
    if (!client) {
      throw new Error(`No Alchemy client available for chain ${chainId}`);
    }

    try {
      const gasPrice = await client.core.getGasPrice();
      return gasPrice;
    } catch (error) {
      console.error(`Error fetching gas price for chain ${chainId}:`, error);
      throw error;
    }
  }

  async getNativeBalance(address: string, chainId: number) {
    const client = this.getClient(chainId);
    if (!client) {
      throw new Error(`No Alchemy client available for chain ${chainId}`);
    }

    try {
      const balance = await client.core.getBalance(address);
      return balance;
    } catch (error) {
      console.error(`Error fetching native balance for ${address} on chain ${chainId}:`, error);
      throw error;
    }
  }

  // Gas Manager / Sponsorship methods would be implemented here
  // These would integrate with Alchemy's Gas Manager API
  async checkGasSponsorship(userId: string, chainId: number, estimatedGas: string) {
    // TODO: Implement actual Gas Manager API integration
    // For now, return mock sponsorship status
    return {
      canSponsor: true,
      remainingBudget: 1000,
      estimatedCost: parseFloat(estimatedGas) * 0.00001, // Mock gas cost calculation
    };
  }

  async sponsorTransaction(transactionData: any, userId: string, chainId: number) {
    // TODO: Implement actual transaction sponsorship
    // This would use Alchemy's Smart Wallet SDK for gasless transactions
    console.log('Sponsoring transaction:', { transactionData, userId, chainId });
    
    // Mock implementation
    return {
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      sponsored: true,
      chainId,
    };
  }
}

export { AlchemyService };
export const alchemyService = new AlchemyService();
