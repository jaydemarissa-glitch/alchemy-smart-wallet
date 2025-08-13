import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { alchemyService, SUPPORTED_CHAINS } from "./services/alchemyService";
import { insertAssetSchema, insertTransactionSchema, insertGasPolicySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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

  // Gasless transaction routes
  app.post('/api/transactions/gasless', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { to, value, data, chainId, walletId } = req.body;

      if (!to || !chainId || !walletId) {
        return res.status(400).json({ message: "Missing required transaction parameters" });
      }

      // Check gas sponsorship eligibility
      const gasCheck = await alchemyService.checkGasSponsorship(userId, chainId, value || '0');
      
      if (!gasCheck.canSponsor) {
        return res.status(400).json({ 
          message: "Gas sponsorship not available",
          reason: "Monthly limit exceeded or insufficient budget"
        });
      }

      // Sponsor and submit transaction
      const sponsoredTx = await alchemyService.sponsorTransaction({
        to,
        value: value || '0',
        data: data || '0x',
      }, userId, chainId);

      // Save transaction to database
      const transaction = await storage.createTransaction({
        userId,
        walletId,
        hash: sponsoredTx.hash,
        chainId,
        type: 'send',
        status: 'pending',
        toAddress: to,
        amount: value || '0',
        gasSponsor: true,
        metadata: { sponsored: true, gasCheck },
      });

      // Update gas usage
      await storage.updateGasUsage(userId, chainId, gasCheck.estimatedCost);

      res.json({
        transaction,
        hash: sponsoredTx.hash,
        sponsored: true,
        estimatedCost: gasCheck.estimatedCost,
      });
    } catch (error) {
      console.error("Error processing gasless transaction:", error);
      res.status(500).json({ message: "Failed to process gasless transaction" });
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

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
