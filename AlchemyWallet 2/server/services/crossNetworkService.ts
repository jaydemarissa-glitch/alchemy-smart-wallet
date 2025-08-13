/**
 * Cross-Network Service - Multi-Chain Support
 * 
 * This service provides unified access to both EVM and non-EVM blockchains,
 * including Solana, Cosmos, and other networks.
 */

import { alchemyService, createAlchemyService } from './alchemyService';
import { monitoringService } from './monitoringService';

// Network types
export enum NetworkType {
  EVM = 'evm',
  SOLANA = 'solana',
  COSMOS = 'cosmos',
  BITCOIN = 'bitcoin',
}

// Unified network configuration
interface NetworkConfig {
  id: number | string;
  name: string;
  type: NetworkType;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  enabled: boolean;
  testnet: boolean;
}

// Unified transaction interface
interface UnifiedTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  fee: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number | string;
  timestamp?: number;
  networkId: string | number;
  networkType: NetworkType;
  nativeData?: any; // Network-specific data
}

// Unified balance interface
interface UnifiedBalance {
  address: string;
  networkId: string | number;
  networkType: NetworkType;
  nativeBalance: string;
  tokens: {
    address: string;
    symbol: string;
    name: string;
    balance: string;
    decimals: number;
    logoUrl?: string;
  }[];
}

// Network adapter interface
interface NetworkAdapter {
  getBalance(address: string): Promise<UnifiedBalance>;
  getTransaction(hash: string): Promise<UnifiedTransaction | null>;
  sendTransaction(transaction: any): Promise<string>;
  estimateFees(transaction: any): Promise<{ fee: string; gasLimit?: string }>;
  validateAddress(address: string): boolean;
  isNetworkHealthy(): Promise<boolean>;
}

export class CrossNetworkService {
  private networks: Map<string | number, NetworkConfig> = new Map();
  private adapters: Map<NetworkType, NetworkAdapter> = new Map();
  private fallbackProviders: Map<string, string[]> = new Map();

  constructor() {
    this.initializeNetworks();
    this.initializeAdapters();
  }

  private initializeNetworks() {
    const networks: NetworkConfig[] = [
      // EVM Networks
      {
        id: 1,
        name: 'Ethereum',
        type: NetworkType.EVM,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://eth-mainnet.g.alchemy.com/v2/'],
        blockExplorerUrls: ['https://etherscan.io'],
        enabled: true,
        testnet: false,
      },
      {
        id: 137,
        name: 'Polygon',
        type: NetworkType.EVM,
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-mainnet.g.alchemy.com/v2/'],
        blockExplorerUrls: ['https://polygonscan.com'],
        enabled: true,
        testnet: false,
      },
      {
        id: 56,
        name: 'BNB Smart Chain',
        type: NetworkType.EVM,
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://bnb-mainnet.g.alchemy.com/v2/'],
        blockExplorerUrls: ['https://bscscan.com'],
        enabled: true,
        testnet: false,
      },
      {
        id: 8453,
        name: 'Base',
        type: NetworkType.EVM,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://base-mainnet.g.alchemy.com/v2/'],
        blockExplorerUrls: ['https://basescan.org'],
        enabled: true,
        testnet: false,
      },
      {
        id: 42161,
        name: 'Arbitrum One',
        type: NetworkType.EVM,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://arb-mainnet.g.alchemy.com/v2/'],
        blockExplorerUrls: ['https://arbiscan.io'],
        enabled: true,
        testnet: false,
      },
      // Non-EVM Networks
      {
        id: 'solana-mainnet',
        name: 'Solana',
        type: NetworkType.SOLANA,
        nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
        rpcUrls: ['https://api.mainnet-beta.solana.com'],
        blockExplorerUrls: ['https://explorer.solana.com'],
        enabled: true,
        testnet: false,
      },
      {
        id: 'cosmos-hub',
        name: 'Cosmos Hub',
        type: NetworkType.COSMOS,
        nativeCurrency: { name: 'Cosmos', symbol: 'ATOM', decimals: 6 },
        rpcUrls: ['https://cosmos-rpc.polkachu.com'],
        blockExplorerUrls: ['https://www.mintscan.io/cosmos'],
        enabled: true,
        testnet: false,
      },
    ];

    networks.forEach(network => {
      this.networks.set(network.id, network);
    });

    // Set up fallback providers
    this.fallbackProviders.set('solana-mainnet', [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana',
    ]);
  }

  private initializeAdapters() {
    // EVM Adapter
    this.adapters.set(NetworkType.EVM, new EVMAdapter());
    
    // Solana Adapter
    this.adapters.set(NetworkType.SOLANA, new SolanaAdapter());
    
    // Cosmos Adapter (placeholder)
    this.adapters.set(NetworkType.COSMOS, new CosmosAdapter());
  }

  /**
   * Get unified balance across all supported networks
   */
  async getUnifiedBalance(address: string, networkId?: string | number): Promise<UnifiedBalance[]> {
    const results: UnifiedBalance[] = [];
    const networksToQuery = networkId ? [this.networks.get(networkId)].filter(Boolean) : Array.from(this.networks.values());

    for (const network of networksToQuery) {
      if (!network || !network.enabled) continue;

      try {
        const adapter = this.adapters.get(network.type);
        if (!adapter) continue;

        // Validate address format for the network
        if (!adapter.validateAddress(address)) {
          console.warn(`Invalid address format for ${network.name}: ${address}`);
          continue;
        }

        const balance = await adapter.getBalance(address);
        results.push(balance);

        // Log successful balance fetch
        monitoringService.logSecurityEvent({
          type: 'suspicious_transaction',
          details: {
            action: 'balance_fetched',
            network: network.name,
            address: address.substring(0, 10) + '...',
          },
          severity: 'low',
        });

      } catch (error) {
        console.error(`Error fetching balance for ${network.name}:`, error);
        
        monitoringService.logSecurityEvent({
          type: 'suspicious_transaction',
          details: {
            action: 'balance_fetch_failed',
            network: network.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          severity: 'medium',
        });
      }
    }

    return results;
  }

  /**
   * Get unified transaction details
   */
  async getUnifiedTransaction(hash: string, networkId: string | number): Promise<UnifiedTransaction | null> {
    const network = this.networks.get(networkId);
    if (!network || !network.enabled) {
      throw new Error(`Network ${networkId} not supported or disabled`);
    }

    const adapter = this.adapters.get(network.type);
    if (!adapter) {
      throw new Error(`No adapter available for network type: ${network.type}`);
    }

    try {
      const transaction = await adapter.getTransaction(hash);
      return transaction;
    } catch (error) {
      console.error(`Error fetching transaction ${hash} on ${network.name}:`, error);
      throw error;
    }
  }

  /**
   * Send unified transaction
   */
  async sendUnifiedTransaction(transaction: any, networkId: string | number): Promise<string> {
    const network = this.networks.get(networkId);
    if (!network || !network.enabled) {
      throw new Error(`Network ${networkId} not supported or disabled`);
    }

    const adapter = this.adapters.get(network.type);
    if (!adapter) {
      throw new Error(`No adapter available for network type: ${network.type}`);
    }

    // Check network health before sending
    const isHealthy = await adapter.isNetworkHealthy();
    if (!isHealthy) {
      monitoringService.logSecurityEvent({
        type: 'suspicious_transaction',
        details: {
          action: 'network_unhealthy',
          network: network.name,
          transaction: 'attempted',
        },
        severity: 'high',
      });
      throw new Error(`Network ${network.name} is currently unhealthy`);
    }

    try {
      const txHash = await adapter.sendTransaction(transaction);
      
      monitoringService.logSecurityEvent({
        type: 'suspicious_transaction',
        details: {
          action: 'transaction_sent',
          network: network.name,
          hash: txHash,
        },
        severity: 'low',
      });

      return txHash;
    } catch (error) {
      monitoringService.logSecurityEvent({
        type: 'suspicious_transaction',
        details: {
          action: 'transaction_failed',
          network: network.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        severity: 'high',
      });
      throw error;
    }
  }

  /**
   * Estimate fees for transaction
   */
  async estimateUnifiedFees(transaction: any, networkId: string | number): Promise<{ fee: string; gasLimit?: string }> {
    const network = this.networks.get(networkId);
    if (!network || !network.enabled) {
      throw new Error(`Network ${networkId} not supported or disabled`);
    }

    const adapter = this.adapters.get(network.type);
    if (!adapter) {
      throw new Error(`No adapter available for network type: ${network.type}`);
    }

    return await adapter.estimateFees(transaction);
  }

  /**
   * Get supported networks
   */
  getSupportedNetworks(): NetworkConfig[] {
    return Array.from(this.networks.values()).filter(network => network.enabled);
  }

  /**
   * Validate address for specific network
   */
  validateAddressForNetwork(address: string, networkId: string | number): boolean {
    const network = this.networks.get(networkId);
    if (!network) return false;

    const adapter = this.adapters.get(network.type);
    if (!adapter) return false;

    return adapter.validateAddress(address);
  }

  /**
   * Get network health status
   */
  async getNetworkHealth(): Promise<Record<string, { healthy: boolean; latency?: number }>> {
    const health: Record<string, { healthy: boolean; latency?: number }> = {};

    for (const [networkId, network] of Array.from(this.networks.entries())) {
      if (!network.enabled) continue;

      const adapter = this.adapters.get(network.type);
      if (!adapter) continue;

      try {
        const startTime = Date.now();
        const isHealthy = await adapter.isNetworkHealthy();
        const latency = Date.now() - startTime;

        health[networkId.toString()] = {
          healthy: isHealthy,
          latency,
        };
      } catch (error) {
        health[networkId.toString()] = {
          healthy: false,
        };
      }
    }

    return health;
  }
}

// EVM Adapter Implementation
class EVMAdapter implements NetworkAdapter {
  async getBalance(address: string): Promise<UnifiedBalance> {
    // Implementation uses existing alchemyService
    // This is a simplified version - in production, you'd determine the chainId
    const chainId = 1; // Default to Ethereum for this example
    
    try {
      const nativeBalance = await alchemyService.getNativeBalance(address, chainId);
      const tokenBalances = await alchemyService.getTokenBalances(address, chainId);

      const tokens = tokenBalances.tokenBalances.map((token: any) => ({
        address: token.contractAddress,
        symbol: token.symbol || 'UNKNOWN',
        name: token.name || 'Unknown Token',
        balance: token.tokenBalance || '0',
        decimals: token.decimals || 18,
        logoUrl: token.logo,
      }));

      return {
        address,
        networkId: chainId,
        networkType: NetworkType.EVM,
        nativeBalance: nativeBalance.toString(),
        tokens,
      };
    } catch (error) {
      throw new Error(`Failed to get EVM balance: ${error}`);
    }
  }

  async getTransaction(hash: string): Promise<UnifiedTransaction | null> {
    try {
      const chainId = 1; // Default to Ethereum
      const tx = await alchemyService.getTransaction(hash, chainId);
      const receipt = await alchemyService.getTransactionReceipt(hash, chainId);

      if (!tx) return null;

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        amount: tx.value?.toString() || '0',
        fee: (BigInt(tx.gasPrice?.toString() || '0') * BigInt(tx.gasLimit?.toString() || '0')).toString(),
        status: receipt ? (receipt.status === 1 ? 'confirmed' : 'failed') : 'pending',
        blockNumber: tx.blockNumber || undefined,
        timestamp: tx.timestamp,
        networkId: chainId,
        networkType: NetworkType.EVM,
        nativeData: tx,
      };
    } catch (error) {
      throw new Error(`Failed to get EVM transaction: ${error}`);
    }
  }

  async sendTransaction(transaction: any): Promise<string> {
    // This would integrate with wallet signing in production
    throw new Error('EVM transaction sending not implemented in this example');
  }

  async estimateFees(transaction: any): Promise<{ fee: string; gasLimit?: string }> {
    try {
      const chainId = 1; // Default to Ethereum
      const gasPrice = await alchemyService.getGasPrice(chainId);
      const gasLimit = '21000'; // Standard transfer

      const fee = (BigInt(gasPrice.toString()) * BigInt(gasLimit)).toString();

      return { fee, gasLimit };
    } catch (error) {
      throw new Error(`Failed to estimate EVM fees: ${error}`);
    }
  }

  validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  async isNetworkHealthy(): Promise<boolean> {
    try {
      await alchemyService.getGasPrice(1); // Test with Ethereum
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Solana Adapter Implementation (Simplified)
class SolanaAdapter implements NetworkAdapter {
  async getBalance(address: string): Promise<UnifiedBalance> {
    // This is a simplified implementation
    // In production, you'd use @solana/web3.js
    try {
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      });

      const data = await response.json();
      const balance = data.result?.value?.toString() || '0';

      return {
        address,
        networkId: 'solana-mainnet',
        networkType: NetworkType.SOLANA,
        nativeBalance: balance,
        tokens: [], // Token balances would require additional calls
      };
    } catch (error) {
      throw new Error(`Failed to get Solana balance: ${error}`);
    }
  }

  async getTransaction(hash: string): Promise<UnifiedTransaction | null> {
    try {
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [hash, { encoding: 'json' }],
        }),
      });

      const data = await response.json();
      const tx = data.result;

      if (!tx) return null;

      return {
        hash,
        from: tx.transaction?.message?.accountKeys?.[0] || '',
        to: tx.transaction?.message?.accountKeys?.[1] || '',
        amount: '0', // Would need to parse instruction data
        fee: tx.meta?.fee?.toString() || '0',
        status: tx.meta?.err ? 'failed' : 'confirmed',
        blockNumber: tx.slot,
        timestamp: tx.blockTime,
        networkId: 'solana-mainnet',
        networkType: NetworkType.SOLANA,
        nativeData: tx,
      };
    } catch (error) {
      throw new Error(`Failed to get Solana transaction: ${error}`);
    }
  }

  async sendTransaction(transaction: any): Promise<string> {
    throw new Error('Solana transaction sending not implemented in this example');
  }

  async estimateFees(transaction: any): Promise<{ fee: string }> {
    // Solana has relatively fixed fees
    return { fee: '5000' }; // 0.000005 SOL typical fee
  }

  validateAddress(address: string): boolean {
    // Solana addresses are base58 encoded and typically 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  async isNetworkHealthy(): Promise<boolean> {
    try {
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
        }),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Cosmos Adapter Implementation (Placeholder)
class CosmosAdapter implements NetworkAdapter {
  async getBalance(address: string): Promise<UnifiedBalance> {
    throw new Error('Cosmos adapter not implemented');
  }

  async getTransaction(hash: string): Promise<UnifiedTransaction | null> {
    throw new Error('Cosmos adapter not implemented');
  }

  async sendTransaction(transaction: any): Promise<string> {
    throw new Error('Cosmos adapter not implemented');
  }

  async estimateFees(transaction: any): Promise<{ fee: string }> {
    throw new Error('Cosmos adapter not implemented');
  }

  validateAddress(address: string): boolean {
    // Cosmos addresses typically start with a prefix and are bech32 encoded
    return /^cosmos[0-9a-z]{39}$/.test(address);
  }

  async isNetworkHealthy(): Promise<boolean> {
    return false; // Not implemented
  }
}

export const crossNetworkService = new CrossNetworkService();