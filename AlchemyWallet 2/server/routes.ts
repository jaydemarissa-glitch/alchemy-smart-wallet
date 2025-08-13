import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { alchemyService, SUPPORTED_CHAINS } from "./services/alchemyService";
import { gaslessCashService } from "./services/gaslessCashService";
import { monitoringService } from "./services/monitoringService";
import { securityService } from "./services/securityService";
import { gasOptimizationService } from "./services/gasOptimizationService";
import { crossNetworkService } from "./services/crossNetworkService";
import { providerService } from "./services/providerService";
import { insertAssetSchema, insertTransactionSchema, insertGasPolicySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Security headers and CORS
  app.use(securityService.securityHeaders());

  // Input validation and sanitization
  app.use(securityService.validateInput());

  // Rate limiting for different endpoint types
  app.use('/api/auth', securityService.createRateLimiter('auth'));
  app.use('/api/transactions/gasless', securityService.createRateLimiter('gasless'));
  app.use('/api/transactions', securityService.createRateLimiter('transaction'));
  app.use('/api', securityService.createRateLimiter('api'));

  // Performance monitoring middleware
  app.use((req: any, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      monitoringService.trackApiPerformance({
        endpoint: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        timestamp: Date.now(),
        userId: req.user?.claims?.sub,
      });
    });
    
    next();
  });

  // Security monitoring middleware (enhanced)
  app.use((req: any, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Enhanced suspicious pattern detection
    const suspiciousPatterns = [
      /\.\.\/|\.\.\\/, // Path traversal
      /<script[^>]*>|javascript:/i, // XSS attempts
      /union\s+select|drop\s+table/i, // SQL injection
      /exec\(|eval\(/i, // Code execution
    ];

    const checkString = `${req.path}${JSON.stringify(req.query)}${JSON.stringify(req.body)}`;
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(checkString)) {
        monitoringService.logSecurityEvent({
          type: 'suspicious_transaction',
          ipAddress: clientIp,
          details: { 
            path: req.path, 
            userAgent: req.headers['user-agent'],
            pattern: pattern.source,
            data: checkString.substring(0, 100),
          },
          severity: 'high',
        });
        
        return res.status(400).json({ message: 'Invalid request detected' });
      }
    }
    
    next();
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Smart Wallet routes
  app.get('/api/wallets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallets = await storage.getSmartWallets(userId);
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.post('/api/wallets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { address, chainId } = req.body;
      
      if (!address || !chainId) {
        return res.status(400).json({ message: "Address and chainId are required" });
      }

      const wallet = await storage.createSmartWallet({
        userId,
        address: address.toLowerCase(),
        chainId: parseInt(chainId),
      });

      res.json(wallet);
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ message: "Failed to create wallet" });
    }
  });

  // Asset routes
  app.get('/api/assets', async (req, res) => {
    try {
      const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : undefined;
      const assets = await storage.getAssets(chainId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.post('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const assetData = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(assetData);
      res.json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  // Token balance routes
  app.get('/api/balances', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const walletId = req.query.walletId as string | undefined;
      const balances = await storage.getTokenBalances(userId, walletId);
      res.json(balances);
    } catch (error) {
      console.error("Error fetching balances:", error);
      res.status(500).json({ message: "Failed to fetch balances" });
    }
  });

  app.get('/api/portfolio', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const totalValue = await storage.getUserPortfolioValue(userId);
      const balances = await storage.getTokenBalances(userId);
      
      // Calculate portfolio stats
      const portfolioData = {
        totalBalance: totalValue,
        change24h: 2.4, // Mock value - would be calculated from historical data
        assets: balances.map(balance => ({
          id: balance.asset.id,
          name: balance.asset.name,
          symbol: balance.asset.symbol,
          balance: balance.balance,
          usdValue: balance.usdValue || 0,
          change24h: Math.random() * 10 - 5, // Mock value
          logoUrl: balance.asset.logoUrl,
          chainId: balance.asset.chainId,
        })),
      };

      res.json(portfolioData);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // Update balances from blockchain
  app.post('/api/balances/refresh', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallets = await storage.getSmartWallets(userId);
      
      const updatedBalances = [];

      for (const wallet of wallets) {
        try {
          // Get native balance
          const nativeBalance = await alchemyService.getNativeBalance(wallet.address, wallet.chainId);
          
          // Get token balances
          const tokenBalances = await alchemyService.getTokenBalances(wallet.address, wallet.chainId);
          
          // Process and update balances in database
          // This would involve more complex logic to handle token metadata, pricing, etc.
          console.log(`Updated balances for wallet ${wallet.address} on chain ${wallet.chainId}`);
          
        } catch (error) {
          console.error(`Error refreshing balances for wallet ${wallet.address}:`, error);
        }
      }

      res.json({ message: "Balances refreshed successfully" });
    } catch (error) {
      console.error("Error refreshing balances:", error);
      res.status(500).json({ message: "Failed to refresh balances" });
    }
  });

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const transactions = await storage.getTransactions(userId, limit);
      
      const formattedTransactions = transactions.map(tx => ({
        ...tx,
        chainName: SUPPORTED_CHAINS[tx.chainId as keyof typeof SUPPORTED_CHAINS]?.name || 'Unknown',
      }));

      res.json(formattedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        userId,
      });

      const transaction = await storage.createTransaction(transactionData);
      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Gasless transaction routes - Enhanced with gasless.cash integration and reentrancy protection
  app.post('/api/transactions/gasless', isAuthenticated, securityService.reentrancyGuard(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { to, value, data, chainId, walletId } = req.body;

      if (!to || !chainId || !walletId) {
        return res.status(400).json({ message: "Missing required transaction parameters" });
      }

      // Enhanced gas optimization
      const gasEstimate = await gasOptimizationService.getOptimizedGasEstimate(
        chainId,
        { to, value, data },
        req.body.urgency || 'medium'
      );

      // Check if chain is supported by gasless.cash
      if (!gaslessCashService.isChainSupported(chainId)) {
        return res.status(400).json({ 
          message: "Chain not supported for gasless transactions",
          supportedChains: [1, 56, 137, 8453, 42161]
        });
      }

      // Get optimization strategies
      const optimizationStrategies = gasOptimizationService.analyzeOptimizationStrategies(
        { to, value, data },
        chainId
      );

      // Get quote from gasless.cash
      const quote = await gaslessCashService.getGaslessQuote({
        to,
        value: value || '0',
        data: data || '0x',
        chainId
      }, userId);
      
      if (!quote.canSponsor) {
        monitoringService.logSecurityEvent({
          type: 'rate_limit_exceeded',
          userId,
          details: { 
            chainId, 
            requestedValue: value,
            remainingBudget: quote.remainingBudget 
          },
          severity: 'low',
        });

        return res.status(400).json({ 
          message: "Gas sponsorship not available",
          reason: "Monthly limit exceeded or insufficient budget",
          remainingBudget: quote.remainingBudget,
          optimizationStrategies,
        });
      }

      // Submit transaction via gasless.cash
      const sponsoredTx = await gaslessCashService.submitGaslessTransaction({
        to,
        value: value || '0',
        data: data || '0x',
        chainId
      }, userId);

      if (!sponsoredTx.success) {
        return res.status(500).json({
          message: "Failed to sponsor transaction",
          error: sponsoredTx.errorMessage
        });
      }

      // Start monitoring the transaction
      monitoringService.startTransactionTracking({
        hash: sponsoredTx.transactionHash!,
        chainId,
        gasEstimate: gasEstimate.gasLimit,
        sponsored: true,
      });

      // Save transaction to database
      const transaction = await storage.createTransaction({
        userId,
        walletId,
        hash: sponsoredTx.transactionHash!,
        chainId,
        type: 'send',
        status: 'pending',
        toAddress: to,
        amount: value || '0',
        gasSponsor: true,
        metadata: { 
          sponsored: true, 
          gaslessCash: true,
          quote,
          gasEstimate,
          optimizationStrategies,
          sponsorshipCost: sponsoredTx.sponsorshipCost
        },
      });

      // Update gas usage in policies
      await storage.updateGasUsage(userId, chainId, quote.estimatedCost);

      res.json({
        transaction,
        hash: sponsoredTx.transactionHash,
        sponsored: true,
        gasEstimate,
        optimizationStrategies,
        estimatedCost: quote.estimatedCost,
        sponsorshipCost: sponsoredTx.sponsorshipCost,
        service: 'gasless.cash'
      });
    } catch (error) {
      console.error("Error processing gasless transaction:", error);
      res.status(500).json({ message: "Failed to process gasless transaction" });
    }
  });

  // New endpoint to get gasless quote without submitting transaction
  app.post('/api/transactions/gasless/quote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { to, value, data, chainId } = req.body;

      if (!to || !chainId) {
        return res.status(400).json({ message: "Missing required transaction parameters" });
      }

      if (!gaslessCashService.isChainSupported(chainId)) {
        return res.status(400).json({ 
          message: "Chain not supported for gasless transactions",
          supportedChains: [1, 56, 137, 8453, 42161]
        });
      }

      const quote = await gaslessCashService.getGaslessQuote({
        to,
        value: value || '0',
        data: data || '0x',
        chainId
      }, userId);

      res.json(quote);
    } catch (error) {
      console.error("Error getting gasless quote:", error);
      res.status(500).json({ message: "Failed to get gasless quote" });
    }
  });

  // New endpoint to get user gasless stats
  app.get('/api/gasless/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await gaslessCashService.getUserGaslessStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching gasless stats:", error);
      res.status(500).json({ message: "Failed to fetch gasless statistics" });
    }
  });

  // Gas policy routes
  app.get('/api/gas-policies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const policies = await storage.getGasPolicies(userId);
      res.json(policies);
    } catch (error) {
      console.error("Error fetching gas policies:", error);
      res.status(500).json({ message: "Failed to fetch gas policies" });
    }
  });

  app.post('/api/gas-policies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const policyData = insertGasPolicySchema.parse({
        ...req.body,
        userId,
      });

      const policy = await storage.createGasPolicy(policyData);
      res.json(policy);
    } catch (error) {
      console.error("Error creating gas policy:", error);
      res.status(500).json({ message: "Failed to create gas policy" });
    }
  });

  // Chain configuration routes
  app.get('/api/chains', (req, res) => {
    const chains = Object.entries(SUPPORTED_CHAINS).map(([id, config]) => ({
      id: parseInt(id),
      name: config.name,
      rpcUrl: alchemyService.getRpcUrl(parseInt(id)),
    }));
    
    res.json(chains);
  });

  // Health check - Enhanced with monitoring data
  app.get('/api/health', (req, res) => {
    const healthStatus = monitoringService.getHealthStatus();
    res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
  });

  // New monitoring endpoints
  app.get('/api/monitoring/transactions', isAuthenticated, (req, res) => {
    const timeframe = req.query.timeframe ? parseInt(req.query.timeframe as string) : undefined;
    const stats = monitoringService.getTransactionStats(timeframe);
    res.json(stats);
  });

  app.get('/api/monitoring/security', isAuthenticated, (req, res) => {
    const type = req.query.type as any;
    const severity = req.query.severity as any;
    const timeframe = req.query.timeframe ? parseInt(req.query.timeframe as string) : undefined;
    const events = monitoringService.getSecurityEvents(type, severity, timeframe);
    res.json(events);
  });

  app.get('/api/monitoring/performance', isAuthenticated, (req, res) => {
    const timeframe = req.query.timeframe ? parseInt(req.query.timeframe as string) : undefined;
    const stats = monitoringService.getApiPerformanceStats(timeframe);
    res.json(stats);
  });

  // New enhanced endpoints

  // Cross-network support
  app.get('/api/networks', (req, res) => {
    const networks = crossNetworkService.getSupportedNetworks();
    res.json(networks);
  });

  app.get('/api/networks/health', async (req, res) => {
    try {
      const health = await crossNetworkService.getNetworkHealth();
      res.json(health);
    } catch (error) {
      console.error('Error getting network health:', error);
      res.status(500).json({ message: 'Failed to get network health' });
    }
  });

  app.get('/api/balances/unified', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const networkId = req.query.networkId;
      
      // Get user's wallets first
      const wallets = await storage.getSmartWallets(userId);
      const allBalances = [];

      for (const wallet of wallets) {
        try {
          const balances = await crossNetworkService.getUnifiedBalance(
            wallet.address, 
            networkId || wallet.chainId
          );
          allBalances.push(...balances);
        } catch (error) {
          console.error(`Error getting unified balance for wallet ${wallet.address}:`, error);
        }
      }

      res.json(allBalances);
    } catch (error) {
      console.error('Error getting unified balances:', error);
      res.status(500).json({ message: 'Failed to get unified balances' });
    }
  });

  app.post('/api/transactions/unified', isAuthenticated, async (req: any, res) => {
    try {
      const { transaction, networkId } = req.body;
      
      if (!transaction || !networkId) {
        return res.status(400).json({ message: 'Transaction and networkId are required' });
      }

      const txHash = await crossNetworkService.sendUnifiedTransaction(transaction, networkId);
      res.json({ hash: txHash, networkId });
    } catch (error) {
      console.error('Error sending unified transaction:', error);
      res.status(500).json({ message: 'Failed to send unified transaction' });
    }
  });

  app.post('/api/transactions/estimate-fees', async (req, res) => {
    try {
      const { transaction, networkId } = req.body;
      
      if (!transaction || !networkId) {
        return res.status(400).json({ message: 'Transaction and networkId are required' });
      }

      const fees = await crossNetworkService.estimateUnifiedFees(transaction, networkId);
      res.json(fees);
    } catch (error) {
      console.error('Error estimating fees:', error);
      res.status(500).json({ message: 'Failed to estimate fees' });
    }
  });

  // Gas optimization endpoints
  app.post('/api/gas/optimize', isAuthenticated, async (req: any, res) => {
    try {
      const { transaction, chainId, urgency = 'medium' } = req.body;
      
      if (!transaction || !chainId) {
        return res.status(400).json({ message: 'Transaction and chainId are required' });
      }

      const gasEstimate = await gasOptimizationService.getOptimizedGasEstimate(
        chainId, 
        transaction, 
        urgency
      );
      
      const strategies = gasOptimizationService.analyzeOptimizationStrategies(transaction, chainId);
      
      res.json({
        gasEstimate,
        optimizationStrategies: strategies,
      });
    } catch (error) {
      console.error('Error optimizing gas:', error);
      res.status(500).json({ message: 'Failed to optimize gas' });
    }
  });

  app.get('/api/gas/analytics', isAuthenticated, (req, res) => {
    try {
      const chainId = parseInt(req.query.chainId as string);
      const timeframe = req.query.timeframe ? parseInt(req.query.timeframe as string) : undefined;
      
      if (!chainId) {
        return res.status(400).json({ message: 'chainId is required' });
      }

      const analytics = gasOptimizationService.getGasAnalytics(chainId, timeframe);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting gas analytics:', error);
      res.status(500).json({ message: 'Failed to get gas analytics' });
    }
  });

  app.get('/api/gas/optimize-ongoing/:txHash', isAuthenticated, async (req, res) => {
    try {
      const { txHash } = req.params;
      const chainId = parseInt(req.query.chainId as string);
      
      if (!chainId) {
        return res.status(400).json({ message: 'chainId is required' });
      }

      const optimization = await gasOptimizationService.optimizeOngoingTransaction(txHash, chainId);
      res.json(optimization);
    } catch (error) {
      console.error('Error optimizing ongoing transaction:', error);
      res.status(500).json({ message: 'Failed to optimize ongoing transaction' });
    }
  });

  // Provider health and fallback status
  app.get('/api/providers/health', isAuthenticated, (req, res) => {
    try {
      const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : undefined;
      const health = providerService.getProviderHealth(chainId);
      res.json(health);
    } catch (error) {
      console.error('Error getting provider health:', error);
      res.status(500).json({ message: 'Failed to get provider health' });
    }
  });

  // Security endpoints
  app.get('/api/security/stats', isAuthenticated, (req, res) => {
    try {
      const stats = securityService.getSecurityStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting security stats:', error);
      res.status(500).json({ message: 'Failed to get security stats' });
    }
  });

  app.post('/api/security/validate-address', (req, res) => {
    try {
      const { address, networkId } = req.body;
      
      if (!address || !networkId) {
        return res.status(400).json({ message: 'Address and networkId are required' });
      }

      const isValid = crossNetworkService.validateAddressForNetwork(address, networkId);
      res.json({ valid: isValid });
    } catch (error) {
      console.error('Error validating address:', error);
      res.status(500).json({ message: 'Failed to validate address' });
    }
  });

  // Enhanced health check with comprehensive status
  app.get('/api/health', (req, res) => {
    const healthStatus = monitoringService.getHealthStatus();
    const securityStats = securityService.getSecurityStats();
    
    const enhancedHealth = {
      ...healthStatus,
      security: securityStats,
      providers: providerService.getProviderHealth(),
    };
    
    res.status(healthStatus.status === 'healthy' ? 200 : 503).json(enhancedHealth);
  });

  const httpServer = createServer(app);
  return httpServer;
}
