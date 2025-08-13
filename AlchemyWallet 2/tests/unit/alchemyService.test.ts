import { jest } from '@jest/globals';
import { 
  AlchemyService, 
  AlchemyServiceError, 
  UnsupportedChainError, 
  ClientNotAvailableError, 
  InvalidApiKeyError,
  SUPPORTED_CHAINS,
  type AlchemyServiceConfig 
} from '../../server/services/alchemyService';

// Mock the Alchemy SDK
jest.mock('alchemy-sdk', () => ({
  Alchemy: jest.fn().mockImplementation(() => ({
    core: {
      getTokenBalances: jest.fn(),
      getTokenMetadata: jest.fn(),
      getTransaction: jest.fn(),
      getTransactionReceipt: jest.fn(),
      getGasPrice: jest.fn(),
      getBalance: jest.fn(),
      getBlockNumber: jest.fn(),
      estimateGas: jest.fn(),
    },
  })),
  Network: {
    ETH_MAINNET: 'eth-mainnet',
    MATIC_MAINNET: 'matic-mainnet',
    BASE_MAINNET: 'base-mainnet',
    ARB_MAINNET: 'arb-mainnet',
  },
}));

// Mock memoizee
jest.mock('memoizee', () => jest.fn((fn) => fn));

describe('AlchemyService', () => {
  let alchemyService: AlchemyService;
  let mockAlchemyInstance: any;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, ALCHEMY_API_KEY: 'test-api-key' };
    
    // Get the mocked Alchemy constructor
    const { Alchemy } = require('alchemy-sdk');
    mockAlchemyInstance = {
      core: {
        getTokenBalances: jest.fn(),
        getTokenMetadata: jest.fn(),
        getTransaction: jest.fn(),
        getTransactionReceipt: jest.fn(),
        getGasPrice: jest.fn(),
        getBalance: jest.fn(),
        getBlockNumber: jest.fn(),
        estimateGas: jest.fn(),
      },
    };
    
    Alchemy.mockImplementation(() => mockAlchemyInstance);
  });

  afterEach(() => {
    process.env = originalEnv;
    if (alchemyService) {
      alchemyService.cleanup();
    }
  });

  describe('Constructor', () => {
    it('should create instance with API key from environment', () => {
      expect(() => new AlchemyService()).not.toThrow();
    });

    it('should create instance with API key from config', () => {
      const config: AlchemyServiceConfig = { apiKey: 'custom-api-key' };
      expect(() => new AlchemyService(config)).not.toThrow();
    });

    it('should throw InvalidApiKeyError when no API key is provided', () => {
      delete process.env.ALCHEMY_API_KEY;
      delete process.env.VITE_ALCHEMY_API_KEY;
      
      expect(() => new AlchemyService()).toThrow(InvalidApiKeyError);
    });

    it('should use VITE_ALCHEMY_API_KEY as fallback', () => {
      delete process.env.ALCHEMY_API_KEY;
      process.env.VITE_ALCHEMY_API_KEY = 'vite-api-key';
      
      expect(() => new AlchemyService()).not.toThrow();
    });

    it('should initialize with default configuration', () => {
      alchemyService = new AlchemyService();
      const stats = alchemyService.getStats();
      
      expect(stats.config.maxRetries).toBe(3);
      expect(stats.config.retryDelay).toBe(1000);
      expect(stats.config.cacheTimeout).toBe(30000);
      expect(stats.config.enableRequestLogging).toBe(false);
    });

    it('should initialize with custom configuration', () => {
      const config: AlchemyServiceConfig = {
        maxRetries: 5,
        retryDelay: 2000,
        cacheTimeout: 60000,
        enableRequestLogging: true,
      };
      
      alchemyService = new AlchemyService(config);
      const stats = alchemyService.getStats();
      
      expect(stats.config.maxRetries).toBe(5);
      expect(stats.config.retryDelay).toBe(2000);
      expect(stats.config.cacheTimeout).toBe(60000);
      expect(stats.config.enableRequestLogging).toBe(true);
    });
  });

  describe('Chain Support', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService();
    });

    it('should support all configured chains', () => {
      const supportedChains = alchemyService.getSupportedChains();
      expect(supportedChains).toHaveLength(Object.keys(SUPPORTED_CHAINS).length);
    });

    it('should return correct chain info for Ethereum', () => {
      const chainInfo = alchemyService.getChainInfo(1);
      
      expect(chainInfo.chainId).toBe(1);
      expect(chainInfo.name).toBe('Ethereum');
      expect(chainInfo.nativeCurrency.symbol).toBe('ETH');
      expect(chainInfo.hasAlchemySupport).toBe(true);
    });

    it('should return correct chain info for BSC', () => {
      const chainInfo = alchemyService.getChainInfo(56);
      
      expect(chainInfo.chainId).toBe(56);
      expect(chainInfo.name).toBe('BSC');
      expect(chainInfo.nativeCurrency.symbol).toBe('BNB');
      expect(chainInfo.hasAlchemySupport).toBe(false);
    });

    it('should throw UnsupportedChainError for invalid chain ID', () => {
      expect(() => alchemyService.getChainInfo(999)).toThrow(UnsupportedChainError);
    });

    it('should get RPC URL for supported chains', () => {
      const rpcUrl = alchemyService.getRpcUrl(1);
      expect(rpcUrl).toContain('https://eth-mainnet.g.alchemy.com/v2/');
      expect(rpcUrl).toContain('test-api-key');
    });

    it('should throw UnsupportedChainError for getRpcUrl with invalid chain', () => {
      expect(() => alchemyService.getRpcUrl(999)).toThrow(UnsupportedChainError);
    });
  });

  describe('Client Management', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService();
    });

    it('should get client for supported chain with Alchemy support', () => {
      const client = alchemyService.getClient(1);
      expect(client).toBeDefined();
    });

    it('should throw ClientNotAvailableError for chain without Alchemy support', () => {
      expect(() => alchemyService.getClient(56)).toThrow(ClientNotAvailableError);
    });

    it('should throw UnsupportedChainError for invalid chain ID', () => {
      expect(() => alchemyService.getClient(999)).toThrow(UnsupportedChainError);
    });
  });

  describe('Token Operations', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService();
    });

    describe('getTokenBalances', () => {
      const validAddress = '0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571';
      const mockBalances = { tokenBalances: [] };

      it('should get token balances for valid address', async () => {
        mockAlchemyInstance.core.getTokenBalances.mockResolvedValue(mockBalances);
        
        const result = await alchemyService.getTokenBalances(validAddress, 1);
        expect(result).toEqual(mockBalances);
        expect(mockAlchemyInstance.core.getTokenBalances).toHaveBeenCalledWith(validAddress);
      });

      it('should throw error for invalid address format', async () => {
        await expect(
          alchemyService.getTokenBalances('invalid-address', 1)
        ).rejects.toThrow(AlchemyServiceError);
      });

      it('should throw error for empty address', async () => {
        await expect(
          alchemyService.getTokenBalances('', 1)
        ).rejects.toThrow(AlchemyServiceError);
      });

      it('should throw UnsupportedChainError for invalid chain', async () => {
        await expect(
          alchemyService.getTokenBalances(validAddress, 999)
        ).rejects.toThrow(UnsupportedChainError);
      });

      it('should cache results for repeated calls', async () => {
        mockAlchemyInstance.core.getTokenBalances.mockResolvedValue(mockBalances);
        
        await alchemyService.getTokenBalances(validAddress, 1);
        await alchemyService.getTokenBalances(validAddress, 1);
        
        expect(mockAlchemyInstance.core.getTokenBalances).toHaveBeenCalledTimes(1);
      });
    });

    describe('getTokenMetadata', () => {
      const validContract = '0xA0b86a33E6441d9b79D0A093Dc3E6B0e60f3a8d2';
      const mockMetadata = { name: 'Test Token', symbol: 'TEST', decimals: 18 };

      it('should get token metadata for valid contract', async () => {
        mockAlchemyInstance.core.getTokenMetadata.mockResolvedValue(mockMetadata);
        
        const result = await alchemyService.getTokenMetadata(validContract, 1);
        expect(result).toEqual(mockMetadata);
      });

      it('should throw error for invalid contract address', async () => {
        await expect(
          alchemyService.getTokenMetadata('invalid-contract', 1)
        ).rejects.toThrow(AlchemyServiceError);
      });

      it('should cache metadata results', async () => {
        mockAlchemyInstance.core.getTokenMetadata.mockResolvedValue(mockMetadata);
        
        await alchemyService.getTokenMetadata(validContract, 1);
        await alchemyService.getTokenMetadata(validContract, 1);
        
        expect(mockAlchemyInstance.core.getTokenMetadata).toHaveBeenCalledTimes(1);
      });
    });

    describe('getMultipleTokenBalances', () => {
      const validAddresses = [
        '0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571',
        '0xA0b86a33E6441d9b79D0A093Dc3E6B0e60f3a8d2',
      ];

      it('should get balances for multiple addresses', async () => {
        mockAlchemyInstance.core.getTokenBalances.mockResolvedValue({ tokenBalances: [] });
        
        const result = await alchemyService.getMultipleTokenBalances(validAddresses, 1);
        
        expect(Object.keys(result)).toHaveLength(2);
        expect(mockAlchemyInstance.core.getTokenBalances).toHaveBeenCalledTimes(2);
      });

      it('should throw error for empty addresses array', async () => {
        await expect(
          alchemyService.getMultipleTokenBalances([], 1)
        ).rejects.toThrow(AlchemyServiceError);
      });

      it('should handle invalid addresses in array', async () => {
        await expect(
          alchemyService.getMultipleTokenBalances(['invalid-address'], 1)
        ).rejects.toThrow(AlchemyServiceError);
      });
    });
  });

  describe('Transaction Operations', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService();
    });

    const validTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    describe('getTransaction', () => {
      const mockTransaction = { hash: validTxHash, value: '1000000000000000000' };

      it('should get transaction for valid hash', async () => {
        mockAlchemyInstance.core.getTransaction.mockResolvedValue(mockTransaction);
        
        const result = await alchemyService.getTransaction(validTxHash, 1);
        expect(result).toEqual(mockTransaction);
      });

      it('should throw error for invalid transaction hash', async () => {
        await expect(
          alchemyService.getTransaction('invalid-hash', 1)
        ).rejects.toThrow(AlchemyServiceError);
      });
    });

    describe('getTransactionReceipt', () => {
      const mockReceipt = { transactionHash: validTxHash, status: 1 };

      it('should get transaction receipt for valid hash', async () => {
        mockAlchemyInstance.core.getTransactionReceipt.mockResolvedValue(mockReceipt);
        
        const result = await alchemyService.getTransactionReceipt(validTxHash, 1);
        expect(result).toEqual(mockReceipt);
      });

      it('should throw error for invalid transaction hash', async () => {
        await expect(
          alchemyService.getTransactionReceipt('invalid-hash', 1)
        ).rejects.toThrow(AlchemyServiceError);
      });
    });

    describe('estimateGas', () => {
      const mockTransaction = { to: '0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571', value: '1000' };
      const mockGasEstimate = '21000';

      it('should estimate gas for valid transaction', async () => {
        mockAlchemyInstance.core.estimateGas.mockResolvedValue(mockGasEstimate);
        
        const result = await alchemyService.estimateGas(mockTransaction, 1);
        expect(result).toEqual(mockGasEstimate);
      });

      it('should throw error for invalid transaction object', async () => {
        await expect(
          alchemyService.estimateGas(null, 1)
        ).rejects.toThrow(AlchemyServiceError);
      });
    });
  });

  describe('Balance Operations', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService();
    });

    const validAddress = '0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571';

    describe('getNativeBalance', () => {
      const mockBalance = '1000000000000000000';

      it('should get native balance for valid address', async () => {
        mockAlchemyInstance.core.getBalance.mockResolvedValue(mockBalance);
        
        const result = await alchemyService.getNativeBalance(validAddress, 1);
        expect(result).toEqual(mockBalance);
      });

      it('should cache balance results', async () => {
        mockAlchemyInstance.core.getBalance.mockResolvedValue(mockBalance);
        
        await alchemyService.getNativeBalance(validAddress, 1);
        await alchemyService.getNativeBalance(validAddress, 1);
        
        expect(mockAlchemyInstance.core.getBalance).toHaveBeenCalledTimes(1);
      });

      it('should throw error for invalid address', async () => {
        await expect(
          alchemyService.getNativeBalance('invalid-address', 1)
        ).rejects.toThrow(AlchemyServiceError);
      });
    });
  });

  describe('Gas Operations', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService();
    });

    describe('getGasPrice', () => {
      const mockGasPrice = '20000000000';

      it('should get gas price for supported chain', async () => {
        mockAlchemyInstance.core.getGasPrice.mockResolvedValue(mockGasPrice);
        
        const result = await alchemyService.getGasPrice(1);
        expect(result).toEqual(mockGasPrice);
      });

      it('should cache gas price results', async () => {
        mockAlchemyInstance.core.getGasPrice.mockResolvedValue(mockGasPrice);
        
        await alchemyService.getGasPrice(1);
        await alchemyService.getGasPrice(1);
        
        expect(mockAlchemyInstance.core.getGasPrice).toHaveBeenCalledTimes(1);
      });
    });

    describe('getBlockNumber', () => {
      const mockBlockNumber = 12345678;

      it('should get current block number', async () => {
        mockAlchemyInstance.core.getBlockNumber.mockResolvedValue(mockBlockNumber);
        
        const result = await alchemyService.getBlockNumber(1);
        expect(result).toEqual(mockBlockNumber);
      });
    });
  });

  describe('Error Handling and Retry Logic', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService({ maxRetries: 2, retryDelay: 100 });
    });

    it('should retry failed requests', async () => {
      mockAlchemyInstance.core.getBlockNumber
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(12345678);
      
      const result = await alchemyService.getBlockNumber(1);
      expect(result).toBe(12345678);
      expect(mockAlchemyInstance.core.getBlockNumber).toHaveBeenCalledTimes(2);
    });

    it('should throw AlchemyServiceError after max retries', async () => {
      mockAlchemyInstance.core.getBlockNumber.mockRejectedValue(new Error('Network error'));
      
      await expect(alchemyService.getBlockNumber(1)).rejects.toThrow(AlchemyServiceError);
      expect(mockAlchemyInstance.core.getBlockNumber).toHaveBeenCalledTimes(2);
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService();
    });

    it('should return healthy status when all chains are accessible', async () => {
      // Mock successful responses for all chains that have Alchemy support
      mockAlchemyInstance.core.getBlockNumber.mockResolvedValue(12345678);
      
      const health = await alchemyService.healthCheck();
      
      // Check that chains with Alchemy support are tested
      expect(health.chains[1]).toBe(true);  // Ethereum
      expect(health.chains[137]).toBe(true); // Polygon
      expect(health.chains[8453]).toBe(true); // Base
      expect(health.chains[42161]).toBe(true); // Arbitrum
      
      // BSC (56) should not be in the health check since it has no Alchemy support
      expect(health.chains[56]).toBeUndefined();
      
      expect(health.status).toBe('healthy');
    });

    it('should return degraded status when some chains fail', async () => {
      // Set up the mock to succeed for first call and fail for subsequent calls
      mockAlchemyInstance.core.getBlockNumber
        .mockResolvedValueOnce(12345678) // First chain succeeds
        .mockRejectedValue(new Error('Network error')); // Subsequent chains fail
      
      const health = await alchemyService.healthCheck();
      
      expect(health.status).toBe('degraded');
      
      // Check that at least one chain succeeded and one failed
      const chainStatuses = Object.values(health.chains);
      expect(chainStatuses).toContain(true);
      expect(chainStatuses).toContain(false);
    });
  });

  describe('Service Statistics', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService();
    });

    it('should return accurate service statistics', () => {
      const stats = alchemyService.getStats();
      
      expect(stats.supportedChains).toBe(Object.keys(SUPPORTED_CHAINS).length);
      expect(stats.activeClients).toBeGreaterThan(0);
      expect(stats.cacheSize).toBe(0);
      expect(stats.config).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService();
    });

    it('should clear cache manually', async () => {
      mockAlchemyInstance.core.getGasPrice.mockResolvedValue('20000000000');
      
      await alchemyService.getGasPrice(1);
      expect(alchemyService.getStats().cacheSize).toBeGreaterThan(0);
      
      alchemyService.clearCache();
      expect(alchemyService.getStats().cacheSize).toBe(0);
    });
  });

  describe('Deprecated Methods', () => {
    beforeEach(() => {
      alchemyService = new AlchemyService();
    });

    it('should warn about deprecated checkGasSponsorship', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await alchemyService.checkGasSponsorship('user123', 1, '21000');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'checkGasSponsorship is deprecated, use gaslessCashService.getGaslessQuote'
      );
      expect(result.canSponsor).toBe(true);
      
      consoleSpy.mockRestore();
    });

    it('should warn about deprecated sponsorTransaction', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await alchemyService.sponsorTransaction({ to: '0x123' }, 'user123', 1);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'sponsorTransaction is deprecated, use gaslessCashService.submitGaslessTransaction'
      );
      expect(result.sponsored).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      alchemyService = new AlchemyService();
      
      expect(() => alchemyService.cleanup()).not.toThrow();
      expect(alchemyService.getStats().cacheSize).toBe(0);
    });
  });
});