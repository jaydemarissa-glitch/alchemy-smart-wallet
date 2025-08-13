import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the entire alchemy-sdk module before any imports
jest.mock('alchemy-sdk', () => ({
  Alchemy: jest.fn(),
  Network: {
    ETH_MAINNET: 'eth-mainnet',
    MATIC_MAINNET: 'matic-mainnet',
    BASE_MAINNET: 'base-mainnet',
    ARB_MAINNET: 'arb-mainnet',
  },
}));

describe('AlchemyService', () => {
  let mockAlchemyInstance: any;
  let AlchemyService: any;
  let MockedAlchemy: any;
  
  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create mock Alchemy instance
    mockAlchemyInstance = {
      core: {
        getTokenBalances: jest.fn(),
        getTokenMetadata: jest.fn(),
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn(),
        getGasPrice: jest.fn(),
        getBalance: jest.fn(),
      },
    };
    
    // Get the mocked Alchemy constructor
    const { Alchemy } = await import('alchemy-sdk');
    MockedAlchemy = Alchemy as jest.MockedFunction<any>;
    MockedAlchemy.mockImplementation(() => mockAlchemyInstance);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with ALCHEMY_API_KEY environment variable', async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      // Import the AlchemyService class directly
      const module = await import('../alchemyService');
      // Use the cached AlchemyService module
      const service = new AlchemyServiceModule.AlchemyService();
      
      expect(service).toBeDefined();
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        network: 'eth-mainnet',
      });
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        network: 'matic-mainnet',
      });
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        network: 'base-mainnet',
      });
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        network: 'arb-mainnet',
      });
      
      // Restore original env var
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should initialize with VITE_ALCHEMY_API_KEY if ALCHEMY_API_KEY is not set', async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      const originalViteKey = process.env.VITE_ALCHEMY_API_KEY;
      
      delete process.env.ALCHEMY_API_KEY;
      process.env.VITE_ALCHEMY_API_KEY = 'vite-test-api-key';
      
      const module = await import('../alchemyService');
      const service = new module.AlchemyService();
      
      expect(service).toBeDefined();
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'vite-test-api-key',
        network: 'eth-mainnet',
      });
      
      // Restore original env vars
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      }
      if (originalViteKey) {
        process.env.VITE_ALCHEMY_API_KEY = originalViteKey;
      } else {
        delete process.env.VITE_ALCHEMY_API_KEY;
      }
    });

    it('should throw error if no API key is provided', async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      const originalViteKey = process.env.VITE_ALCHEMY_API_KEY;
      
      delete process.env.ALCHEMY_API_KEY;
      delete process.env.VITE_ALCHEMY_API_KEY;
      
      const module = await import('../alchemyService');
      
      expect(() => new module.AlchemyService()).toThrow('ALCHEMY_API_KEY is required');
      
      // Restore original env vars
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      }
      if (originalViteKey) {
        process.env.VITE_ALCHEMY_API_KEY = originalViteKey;
      }
    });

    it('should initialize clients for supported chains', async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      new module.AlchemyService();
      
      // Should be called for Ethereum, Polygon, Base, and Arbitrum (not BSC as it has null network)
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        network: 'eth-mainnet',
      });
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        network: 'matic-mainnet',
      });
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        network: 'base-mainnet',
      });
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        network: 'arb-mainnet',
      });
      
      // Restore original env var
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });
  });

  describe('getClient', () => {
    let alchemyService: any;
    
    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      alchemyService = new module.AlchemyService();
      
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return client for supported chain', () => {
      const client = alchemyService.getClient(1); // Ethereum
      expect(client).toBe(mockAlchemyInstance);
    });

    it('should return null for unsupported chain', () => {
      const client = alchemyService.getClient(999);
      expect(client).toBeNull();
    });

    it('should return null for BSC (chain 56) as it has no network', () => {
      const client = alchemyService.getClient(56);
      expect(client).toBeNull();
    });
  });

  describe('getRpcUrl', () => {
    let alchemyService: any;
    
    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      alchemyService = new module.AlchemyService();
      
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return correct RPC URL for supported chain', () => {
      const url = alchemyService.getRpcUrl(1);
      expect(url).toBe('https://eth-mainnet.g.alchemy.com/v2/test-api-key');
    });

    it('should return correct RPC URL for Polygon', () => {
      const url = alchemyService.getRpcUrl(137);
      expect(url).toBe('https://polygon-mainnet.g.alchemy.com/v2/test-api-key');
    });

    it('should throw error for unsupported chain', () => {
      expect(() => alchemyService.getRpcUrl(999)).toThrow('Unsupported chain ID: 999');
    });
  });

  describe('getTokenBalances', () => {
    let alchemyService: any;
    
    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      alchemyService = new module.AlchemyService();
      
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return token balances for valid address and chain', async () => {
      const mockBalances = { tokenBalances: [{ contractAddress: '0x123', tokenBalance: '1000' }] };
      mockAlchemyInstance.core.getTokenBalances.mockResolvedValue(mockBalances);

      const result = await alchemyService.getTokenBalances('0xabc123', 1);
      
      expect(result).toEqual(mockBalances);
      expect(mockAlchemyInstance.core.getTokenBalances).toHaveBeenCalledWith('0xabc123');
    });

    it('should throw error for unsupported chain', async () => {
      await expect(alchemyService.getTokenBalances('0xabc123', 999))
        .rejects.toThrow('No Alchemy client available for chain 999');
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('API Error');
      mockAlchemyInstance.core.getTokenBalances.mockRejectedValue(apiError);

      await expect(alchemyService.getTokenBalances('0xabc123', 1))
        .rejects.toThrow('API Error');
    });
  });

  describe('getTokenMetadata', () => {
    let alchemyService: any;
    
    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      alchemyService = new module.AlchemyService();
      
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return token metadata for valid contract and chain', async () => {
      const mockMetadata = { name: 'Test Token', symbol: 'TEST', decimals: 18 };
      mockAlchemyInstance.core.getTokenMetadata.mockResolvedValue(mockMetadata);

      const result = await alchemyService.getTokenMetadata('0x123', 1);
      
      expect(result).toEqual(mockMetadata);
      expect(mockAlchemyInstance.core.getTokenMetadata).toHaveBeenCalledWith('0x123');
    });

    it('should throw error for unsupported chain', async () => {
      await expect(alchemyService.getTokenMetadata('0x123', 999))
        .rejects.toThrow('No Alchemy client available for chain 999');
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Token not found');
      mockAlchemyInstance.core.getTokenMetadata.mockRejectedValue(apiError);

      await expect(alchemyService.getTokenMetadata('0x123', 1))
        .rejects.toThrow('Token not found');
    });
  });

  describe('getTransaction', () => {
    let alchemyService: any;
    
    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      alchemyService = new module.AlchemyService();
      
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return transaction for valid hash and chain', async () => {
      const mockTransaction = { hash: '0xabc', from: '0x123', to: '0x456' };
      mockAlchemyInstance.core.getTransaction.mockResolvedValue(mockTransaction);

      const result = await alchemyService.getTransaction('0xabc', 1);
      
      expect(result).toEqual(mockTransaction);
      expect(mockAlchemyInstance.core.getTransaction).toHaveBeenCalledWith('0xabc');
    });

    it('should throw error for unsupported chain', async () => {
      await expect(alchemyService.getTransaction('0xabc', 999))
        .rejects.toThrow('No Alchemy client available for chain 999');
    });
  });

  describe('getTransactionReceipt', () => {
    let alchemyService: any;
    
    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      alchemyService = new module.AlchemyService();
      
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return transaction receipt for valid hash and chain', async () => {
      const mockReceipt = { transactionHash: '0xabc', status: 1, gasUsed: '21000' };
      mockAlchemyInstance.core.getTransactionReceipt.mockResolvedValue(mockReceipt);

      const result = await alchemyService.getTransactionReceipt('0xabc', 1);
      
      expect(result).toEqual(mockReceipt);
      expect(mockAlchemyInstance.core.getTransactionReceipt).toHaveBeenCalledWith('0xabc');
    });

    it('should throw error for unsupported chain', async () => {
      await expect(alchemyService.getTransactionReceipt('0xabc', 999))
        .rejects.toThrow('No Alchemy client available for chain 999');
    });
  });

  describe('getGasPrice', () => {
    let alchemyService: any;
    
    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      alchemyService = new module.AlchemyService();
      
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return gas price for valid chain', async () => {
      const mockGasPrice = { toString: () => '20000000000' };
      mockAlchemyInstance.core.getGasPrice.mockResolvedValue(mockGasPrice);

      const result = await alchemyService.getGasPrice(1);
      
      expect(result).toEqual(mockGasPrice);
      expect(mockAlchemyInstance.core.getGasPrice).toHaveBeenCalled();
    });

    it('should throw error for unsupported chain', async () => {
      await expect(alchemyService.getGasPrice(999))
        .rejects.toThrow('No Alchemy client available for chain 999');
    });
  });

  describe('getNativeBalance', () => {
    let alchemyService: any;
    
    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      alchemyService = new module.AlchemyService();
      
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return native balance for valid address and chain', async () => {
      const mockBalance = { toString: () => '1000000000000000000' };
      mockAlchemyInstance.core.getBalance.mockResolvedValue(mockBalance);

      const result = await alchemyService.getNativeBalance('0xabc123', 1);
      
      expect(result).toEqual(mockBalance);
      expect(mockAlchemyInstance.core.getBalance).toHaveBeenCalledWith('0xabc123');
    });

    it('should throw error for unsupported chain', async () => {
      await expect(alchemyService.getNativeBalance('0xabc123', 999))
        .rejects.toThrow('No Alchemy client available for chain 999');
    });
  });

  describe('checkGasSponsorship', () => {
    let alchemyService: any;
    
    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      alchemyService = new module.AlchemyService();
      
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return mock sponsorship data', async () => {
      const result = await alchemyService.checkGasSponsorship('user123', 1, '21000');
      
      expect(result).toMatchObject({
        canSponsor: true,
        remainingBudget: 1000,
      });
      expect(result.estimatedCost).toBeCloseTo(0.21, 2); // Allow for floating point precision
    });

    it('should calculate estimated cost correctly', async () => {
      const result = await alchemyService.checkGasSponsorship('user123', 1, '100000');
      
      expect(result.estimatedCost).toBeCloseTo(1.0, 2); // 100000 * 0.00001
    });
  });

  describe('sponsorTransaction', () => {
    let alchemyService: any;
    
    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';
      
      const module = await import('../alchemyService');
      alchemyService = new module.AlchemyService();
      
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return mock transaction result', async () => {
      const mockTransactionData = { to: '0x123', value: '1000' };
      
      const result = await alchemyService.sponsorTransaction(mockTransactionData, 'user123', 1);
      
      expect(result).toMatchObject({
        sponsored: true,
        chainId: 1,
      });
      expect(result.hash).toMatch(/^0x[a-f0-9]+$/); // Verify it's a valid hash format (relaxed regex)
    });

    it('should log transaction details', async () => {
      const mockTransactionData = { to: '0x123', value: '1000' };
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      await alchemyService.sponsorTransaction(mockTransactionData, 'user123', 1);
      
      expect(consoleSpy).toHaveBeenCalledWith('Sponsoring transaction:', {
        transactionData: mockTransactionData,
        userId: 'user123',
        chainId: 1,
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('SUPPORTED_CHAINS constant', () => {
    it('should export correct chain configurations', async () => {
      const module = await import('../alchemyService');
      
      expect(module.SUPPORTED_CHAINS).toEqual({
        1: { name: 'Ethereum', network: 'eth-mainnet', rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/' },
        56: { name: 'BSC', network: null, rpcUrl: 'https://bnb-mainnet.g.alchemy.com/v2/' },
        137: { name: 'Polygon', network: 'matic-mainnet', rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/' },
        8453: { name: 'Base', network: 'base-mainnet', rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/' },
        42161: { name: 'Arbitrum', network: 'arb-mainnet', rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/' },
      });
    });
  });
});