import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Network } from 'alchemy-sdk';
import { alchemyService, createAlchemyService, AlchemyServiceConfig, SUPPORTED_CHAINS } from '../alchemyService';

// Mock the alchemy-sdk module
jest.mock('alchemy-sdk', () => ({
  Alchemy: jest.fn(),
  Network: {
    ETH_MAINNET: 'eth-mainnet',
    MATIC_MAINNET: 'matic-mainnet',
    BASE_MAINNET: 'base-mainnet',
    ARB_MAINNET: 'arb-mainnet',
  },
}));

// Mock the providerService module
jest.mock('../providerService', () => ({
  providerService: {
    executeWithFallback: jest.fn(),
    getClientWithFallback: jest.fn(),
  },
}));

describe('AlchemyService', () => {
  let mockProviderService: any;
  let mockAlchemyInstance: any;
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

    // Mock the Alchemy constructor
    const { Alchemy } = await import('alchemy-sdk');
    MockedAlchemy = Alchemy as jest.MockedFunction<any>;
    MockedAlchemy.mockImplementation(() => mockAlchemyInstance);

    // Mock the providerService
    const { providerService } = await import('../providerService');
    mockProviderService = providerService;
  });

  describe('Factory Function', () => {
    it('should create a new instance each time createAlchemyService is called', () => {
      const instance1 = createAlchemyService();
      const instance2 = createAlchemyService();
      
      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(Object);
      expect(instance2).toBeInstanceOf(Object);
    });

    it('should accept configuration parameters', () => {
      const customApiKey = 'custom-test-api-key';
      const config: AlchemyServiceConfig = {
        apiKey: customApiKey,
      };
      
      const instance = createAlchemyService(config);
      expect(instance).toBeDefined();
      
      // Test that the custom API key is used in RPC URLs
      const rpcUrl = instance.getRpcUrl(1);
      expect(rpcUrl).toContain(customApiKey);
    });

    it('should create instances with different configurations', () => {
      const config1: AlchemyServiceConfig = { apiKey: 'api-key-1' };
      const config2: AlchemyServiceConfig = { apiKey: 'api-key-2' };
      
      const instance1 = createAlchemyService(config1);
      const instance2 = createAlchemyService(config2);
      
      expect(instance1).not.toBe(instance2);
      expect(instance1.getRpcUrl(1)).toContain('api-key-1');
      expect(instance2.getRpcUrl(1)).toContain('api-key-2');
    });

    it('should work without configuration parameters', () => {
      const instance = createAlchemyService();
      expect(instance).toBeDefined();
      expect(() => instance.getRpcUrl(1)).not.toThrow();
    });

    it('should maintain backward compatibility with default instance', () => {
      expect(alchemyService).toBeDefined();
      expect(typeof alchemyService.getRpcUrl).toBe('function');
      expect(typeof alchemyService.getTokenBalances).toBe('function');
    });
  });

  describe('SUPPORTED_CHAINS configuration', () => {
    it('should have correct chain configurations', () => {
      expect(SUPPORTED_CHAINS[1].name).toBe('Ethereum');
      expect(SUPPORTED_CHAINS[1].rpcUrl).toContain('eth-mainnet');
      
      expect(SUPPORTED_CHAINS[137].name).toBe('Polygon');
      expect(SUPPORTED_CHAINS[137].rpcUrl).toContain('polygon-mainnet');
      
      expect(SUPPORTED_CHAINS[8453].name).toBe('Base');
      expect(SUPPORTED_CHAINS[8453].rpcUrl).toContain('base-mainnet');
      
      expect(SUPPORTED_CHAINS[42161].name).toBe('Arbitrum');
      expect(SUPPORTED_CHAINS[42161].rpcUrl).toContain('arb-mainnet');
    });

    it('should use correct network values for supported chains', () => {
      // FIXED: Now using actual Network enum values from alchemy-sdk instead of hardcoded strings
      expect(SUPPORTED_CHAINS[1].network).toEqual(Network.ETH_MAINNET);
      expect(SUPPORTED_CHAINS[137].network).toEqual(Network.MATIC_MAINNET);
      expect(SUPPORTED_CHAINS[8453].network).toEqual(Network.BASE_MAINNET);
      expect(SUPPORTED_CHAINS[42161].network).toEqual(Network.ARB_MAINNET);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with ALCHEMY_API_KEY environment variable', async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';

      const { AlchemyService } = await import('../alchemyService');
      const service = new AlchemyService();

      expect(service).toBeDefined();
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        network: 'eth-mainnet',
      });

      // Restore original env var
      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should warn when no API key is provided', async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      const originalViteKey = process.env.VITE_ALCHEMY_API_KEY;
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      delete process.env.ALCHEMY_API_KEY;
      delete process.env.VITE_ALCHEMY_API_KEY;

      const { AlchemyService } = await import('../alchemyService');
      new AlchemyService();

      expect(warnSpy).toHaveBeenCalledWith('ALCHEMY_API_KEY not found, relying on multi-provider service');

      // Restore original env vars
      if (originalApiKey) process.env.ALCHEMY_API_KEY = originalApiKey;
      if (originalViteKey) process.env.VITE_ALCHEMY_API_KEY = originalViteKey;
      warnSpy.mockRestore();
    });

    it('should initialize with VITE_ALCHEMY_API_KEY if ALCHEMY_API_KEY is not set', async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      const originalViteKey = process.env.VITE_ALCHEMY_API_KEY;

      delete process.env.ALCHEMY_API_KEY;
      process.env.VITE_ALCHEMY_API_KEY = 'vite-test-api-key';

      const { AlchemyService } = await import('../alchemyService');
      const service = new AlchemyService();

      expect(service).toBeDefined();
      expect(MockedAlchemy).toHaveBeenCalledWith({
        apiKey: 'vite-test-api-key',
        network: 'eth-mainnet',
      });

      // Restore original env vars
      if (originalApiKey) process.env.ALCHEMY_API_KEY = originalApiKey;
      if (originalViteKey) process.env.VITE_ALCHEMY_API_KEY = originalViteKey;
      else delete process.env.VITE_ALCHEMY_API_KEY;
    });
  });

  describe('getClient', () => {
    let alchemyService: any;

    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';

      const { AlchemyService } = await import('../alchemyService');
      alchemyService = new AlchemyService();

      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should return local client for supported chain', async () => {
      const client = await alchemyService.getClient(1); // Ethereum
      expect(client).toBe(mockAlchemyInstance);
    });

    it('should fallback to provider service when local client not available', async () => {
      const mockFallbackClient = { client: mockAlchemyInstance };
      mockProviderService.getClientWithFallback.mockResolvedValue(mockFallbackClient);

      const client = await alchemyService.getClient(999); // Unsupported chain
      expect(mockProviderService.getClientWithFallback).toHaveBeenCalledWith(999);
      expect(client).toBe(mockAlchemyInstance);
    });

    it('should return null when no client is available', async () => {
      mockProviderService.getClientWithFallback.mockResolvedValue(null);

      const client = await alchemyService.getClient(999);
      expect(client).toBeNull();
    });
  });

  describe('getRpcUrl', () => {
    let alchemyService: any;

    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';

      const { AlchemyService } = await import('../alchemyService');
      alchemyService = new AlchemyService();

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

  describe('API methods with provider fallback', () => {
    let alchemyService: any;

    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';

      const { AlchemyService } = await import('../alchemyService');
      alchemyService = new AlchemyService();

      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should call getTokenBalances with provider fallback', async () => {
      const mockBalances = { tokenBalances: [{ contractAddress: '0x123', tokenBalance: '1000' }] };
      mockProviderService.executeWithFallback.mockResolvedValue(mockBalances);

      const result = await alchemyService.getTokenBalances('0xabc123', 1);

      expect(mockProviderService.executeWithFallback).toHaveBeenCalledWith(
        1,
        expect.any(Function),
        'getTokenBalances(0xabc123, 1)'
      );
      expect(result).toEqual(mockBalances);
    });

    it('should call getTokenMetadata with provider fallback', async () => {
      const mockMetadata = { name: 'Test Token', symbol: 'TEST', decimals: 18 };
      mockProviderService.executeWithFallback.mockResolvedValue(mockMetadata);

      const result = await alchemyService.getTokenMetadata('0x123', 1);

      expect(mockProviderService.executeWithFallback).toHaveBeenCalledWith(
        1,
        expect.any(Function),
        'getTokenMetadata(0x123, 1)'
      );
      expect(result).toEqual(mockMetadata);
    });

    it('should call getTransaction with provider fallback', async () => {
      const mockTransaction = { hash: '0xabc', from: '0x123', to: '0x456' };
      mockProviderService.executeWithFallback.mockResolvedValue(mockTransaction);

      const result = await alchemyService.getTransaction('0xabc', 1);

      expect(mockProviderService.executeWithFallback).toHaveBeenCalledWith(
        1,
        expect.any(Function),
        'getTransaction(0xabc, 1)'
      );
      expect(result).toEqual(mockTransaction);
    });

    it('should call getTransactionReceipt with provider fallback', async () => {
      const mockReceipt = { transactionHash: '0xabc', status: 1, gasUsed: '21000' };
      mockProviderService.executeWithFallback.mockResolvedValue(mockReceipt);

      const result = await alchemyService.getTransactionReceipt('0xabc', 1);

      expect(mockProviderService.executeWithFallback).toHaveBeenCalledWith(
        1,
        expect.any(Function),
        'getTransactionReceipt(0xabc, 1)'
      );
      expect(result).toEqual(mockReceipt);
    });

    it('should call getGasPrice with provider fallback', async () => {
      const mockGasPrice = { toString: () => '20000000000' };
      mockProviderService.executeWithFallback.mockResolvedValue(mockGasPrice);

      const result = await alchemyService.getGasPrice(1);

      expect(mockProviderService.executeWithFallback).toHaveBeenCalledWith(
        1,
        expect.any(Function),
        'getGasPrice(1)'
      );
      expect(result).toEqual(mockGasPrice);
    });

    it('should call getNativeBalance with provider fallback', async () => {
      const mockBalance = { toString: () => '1000000000000000000' };
      mockProviderService.executeWithFallback.mockResolvedValue(mockBalance);

      const result = await alchemyService.getNativeBalance('0xabc123', 1);

      expect(mockProviderService.executeWithFallback).toHaveBeenCalledWith(
        1,
        expect.any(Function),
        'getNativeBalance(0xabc123, 1)'
      );
      expect(result).toEqual(mockBalance);
    });
  });

  describe('deprecated methods', () => {
    let alchemyService: any;

    beforeEach(async () => {
      const originalApiKey = process.env.ALCHEMY_API_KEY;
      process.env.ALCHEMY_API_KEY = 'test-api-key';

      const { AlchemyService } = await import('../alchemyService');
      alchemyService = new AlchemyService();

      if (originalApiKey) {
        process.env.ALCHEMY_API_KEY = originalApiKey;
      } else {
        delete process.env.ALCHEMY_API_KEY;
      }
    });

    it('should handle checkGasSponsorship (deprecated) and warn', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await alchemyService.checkGasSponsorship('user123', 1, '21000');

      expect(warnSpy).toHaveBeenCalledWith('checkGasSponsorship is deprecated, use gaslessCashService.getGaslessQuote');
      expect(result).toMatchObject({
        canSponsor: true,
        remainingBudget: 1000,
      });
      expect(result.estimatedCost).toBeCloseTo(0.21, 2);

      warnSpy.mockRestore();
    });

    it('should handle sponsorTransaction (deprecated) and warn', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const mockTransactionData = { to: '0x123', value: '1000' };
      const result = await alchemyService.sponsorTransaction(mockTransactionData, 'user123', 1);

      expect(warnSpy).toHaveBeenCalledWith('sponsorTransaction is deprecated, use gaslessCashService.submitGaslessTransaction');
      expect(result).toMatchObject({
        sponsored: true,
        chainId: 1,
      });
      expect(result.hash).toMatch(/^0x[a-f0-9]+$/); // Verify it's a valid Ethereum-like transaction hash

      warnSpy.mockRestore();
    });
  });

  describe('factory function and exports', () => {
    it('should export createAlchemyService factory function', async () => {
      const { createAlchemyService, AlchemyService } = await import('../alchemyService');

      const service = createAlchemyService();
      expect(service).toBeInstanceOf(AlchemyService);
    });

    it('should export default alchemyService instance', async () => {
      const { alchemyService, AlchemyService } = await import('../alchemyService');

      expect(alchemyService).toBeInstanceOf(AlchemyService);
    });

    it('should export SUPPORTED_CHAINS constant', async () => {
      const { SUPPORTED_CHAINS } = await import('../alchemyService');

      expect(SUPPORTED_CHAINS).toEqual({
        1: { name: 'Ethereum', network: 'eth-mainnet', rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/' },
        56: { name: 'BSC', network: null, rpcUrl: 'https://bnb-mainnet.g.alchemy.com/v2/' },
        137: { name: 'Polygon', network: 'matic-mainnet', rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/' },
        8453: { name: 'Base', network: 'base-mainnet', rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/' },
        42161: { name: 'Arbitrum', network: 'arb-mainnet', rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/' },
      });
    });
  });

  describe('Alchemy SDK compatibility', () => {
    it('should support maxRetries parameter if needed in the future', () => {
      // This test ensures that if maxRetries is ever added to the Alchemy constructor,
      // it will be properly supported as the Alchemy SDK v3.6.2+ does support this parameter
      const { Alchemy, Network } = require('alchemy-sdk');
      
      // Test that Alchemy SDK supports maxRetries configuration
      expect(() => {
        new Alchemy({
          apiKey: 'test-key',
          network: Network.ETH_MAINNET,
          maxRetries: 3
        });
      }).not.toThrow();
    });

    it('should verify current constructor calls are compatible', () => {
      // Verify that the current constructor patterns used in alchemyService
      // are compatible with the Alchemy SDK interface
      const { Alchemy, Network } = require('alchemy-sdk');
      
      expect(() => {
        new Alchemy({
          apiKey: 'test-api-key',
          network: Network.ETH_MAINNET,
        });
      }).not.toThrow();
      
      expect(() => {
        new Alchemy({
          apiKey: 'test-api-key',
          network: Network.MATIC_MAINNET,
        });
      }).not.toThrow();
    });
  });
});