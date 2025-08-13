import {
  users,
  smartWallets,
  assets,
  tokenBalances,
  transactions,
  gasPolicies,
  type User,
  type UpsertUser,
  type SmartWallet,
  type InsertSmartWallet,
  type Asset,
  type InsertAsset,
  type TokenBalance,
  type InsertTokenBalance,
  type Transaction,
  type InsertTransaction,
  type GasPolicy,
  type InsertGasPolicy,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Smart wallet operations
  createSmartWallet(wallet: InsertSmartWallet): Promise<SmartWallet>;
  getSmartWallets(userId: string): Promise<SmartWallet[]>;
  getSmartWallet(id: string): Promise<SmartWallet | undefined>;
  getSmartWalletByAddress(address: string): Promise<SmartWallet | undefined>;
  
  // Asset operations
  createAsset(asset: InsertAsset): Promise<Asset>;
  getAssets(chainId?: number): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  getAssetByContract(contractAddress: string, chainId: number): Promise<Asset | undefined>;
  
  // Token balance operations
  upsertTokenBalance(balance: InsertTokenBalance): Promise<TokenBalance>;
  getTokenBalances(userId: string, walletId?: string): Promise<(TokenBalance & { asset: Asset; wallet: SmartWallet })[]>;
  getUserPortfolioValue(userId: string): Promise<number>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(userId: string, limit?: number): Promise<(Transaction & { asset?: Asset; wallet: SmartWallet })[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  updateTransactionStatus(id: string, status: string, blockNumber?: number): Promise<void>;
  
  // Gas policy operations
  createGasPolicy(policy: InsertGasPolicy): Promise<GasPolicy>;
  getGasPolicies(userId: string): Promise<GasPolicy[]>;
  getGasPolicy(userId: string, chainId: number): Promise<GasPolicy | undefined>;
  updateGasUsage(userId: string, chainId: number, amount: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Smart wallet operations
  async createSmartWallet(wallet: InsertSmartWallet): Promise<SmartWallet> {
    const [newWallet] = await db
      .insert(smartWallets)
      .values(wallet)
      .returning();
    return newWallet;
  }

  async getSmartWallets(userId: string): Promise<SmartWallet[]> {
    return await db
      .select()
      .from(smartWallets)
      .where(eq(smartWallets.userId, userId));
  }

  async getSmartWallet(id: string): Promise<SmartWallet | undefined> {
    const [wallet] = await db
      .select()
      .from(smartWallets)
      .where(eq(smartWallets.id, id));
    return wallet;
  }

  async getSmartWalletByAddress(address: string): Promise<SmartWallet | undefined> {
    const [wallet] = await db
      .select()
      .from(smartWallets)
      .where(eq(smartWallets.address, address));
    return wallet;
  }

  // Asset operations
  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db
      .insert(assets)
      .values(asset)
      .onConflictDoNothing()
      .returning();
    
    if (!newAsset) {
      // Asset already exists, return it
      const [existingAsset] = await db
        .select()
        .from(assets)
        .where(
          asset.contractAddress
            ? and(
                eq(assets.contractAddress, asset.contractAddress),
                eq(assets.chainId, asset.chainId)
              )
            : and(
                eq(assets.symbol, asset.symbol),
                eq(assets.chainId, asset.chainId),
                eq(assets.isNative, true)
              )
        );
      return existingAsset;
    }
    
    return newAsset;
  }

  async getAssets(chainId?: number): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(chainId ? eq(assets.chainId, chainId) : undefined);
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, id));
    return asset;
  }

  async getAssetByContract(contractAddress: string, chainId: number): Promise<Asset | undefined> {
    const [asset] = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.contractAddress, contractAddress),
          eq(assets.chainId, chainId)
        )
      );
    return asset;
  }

  // Token balance operations
  async upsertTokenBalance(balance: InsertTokenBalance): Promise<TokenBalance> {
    const [tokenBalance] = await db
      .insert(tokenBalances)
      .values(balance)
      .onConflictDoUpdate({
        target: [tokenBalances.userId, tokenBalances.walletId, tokenBalances.assetId],
        set: {
          balance: balance.balance,
          usdValue: balance.usdValue,
          lastUpdated: new Date(),
        },
      })
      .returning();
    return tokenBalance;
  }

  async getTokenBalances(userId: string, walletId?: string): Promise<(TokenBalance & { asset: Asset; wallet: SmartWallet })[]> {
    return await db
      .select({
        id: tokenBalances.id,
        userId: tokenBalances.userId,
        walletId: tokenBalances.walletId,
        assetId: tokenBalances.assetId,
        balance: tokenBalances.balance,
        usdValue: tokenBalances.usdValue,
        lastUpdated: tokenBalances.lastUpdated,
        asset: assets,
        wallet: smartWallets,
      })
      .from(tokenBalances)
      .innerJoin(assets, eq(tokenBalances.assetId, assets.id))
      .innerJoin(smartWallets, eq(tokenBalances.walletId, smartWallets.id))
      .where(
        walletId
          ? and(eq(tokenBalances.userId, userId), eq(tokenBalances.walletId, walletId))
          : eq(tokenBalances.userId, userId)
      );
  }

  async getUserPortfolioValue(userId: string): Promise<number> {
    const result = await db
      .select({
        total: sql<number>`sum(${tokenBalances.usdValue})`,
      })
      .from(tokenBalances)
      .where(eq(tokenBalances.userId, userId));
    
    return result[0]?.total || 0;
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async getTransactions(userId: string, limit = 50): Promise<(Transaction & { asset?: Asset; wallet: SmartWallet })[]> {
    const results = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        walletId: transactions.walletId,
        hash: transactions.hash,
        chainId: transactions.chainId,
        type: transactions.type,
        status: transactions.status,
        fromAddress: transactions.fromAddress,
        toAddress: transactions.toAddress,
        amount: transactions.amount,
        assetId: transactions.assetId,
        gasUsed: transactions.gasUsed,
        gasSponsor: transactions.gasSponsor,
        blockNumber: transactions.blockNumber,
        metadata: transactions.metadata,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        asset: assets,
        wallet: smartWallets,
      })
      .from(transactions)
      .leftJoin(assets, eq(transactions.assetId, assets.id))
      .innerJoin(smartWallets, eq(transactions.walletId, smartWallets.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    return results.map(result => ({
      ...result,
      asset: result.asset || undefined,
    }));
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction;
  }

  async updateTransactionStatus(id: string, status: string, blockNumber?: number): Promise<void> {
    await db
      .update(transactions)
      .set({
        status,
        blockNumber,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));
  }

  // Gas policy operations
  async createGasPolicy(policy: InsertGasPolicy): Promise<GasPolicy> {
    const [newPolicy] = await db
      .insert(gasPolicies)
      .values(policy)
      .returning();
    return newPolicy;
  }

  async getGasPolicies(userId: string): Promise<GasPolicy[]> {
    return await db
      .select()
      .from(gasPolicies)
      .where(eq(gasPolicies.userId, userId));
  }

  async getGasPolicy(userId: string, chainId: number): Promise<GasPolicy | undefined> {
    const [policy] = await db
      .select()
      .from(gasPolicies)
      .where(
        and(
          eq(gasPolicies.userId, userId),
          eq(gasPolicies.chainId, chainId),
          eq(gasPolicies.isActive, true)
        )
      );
    return policy;
  }

  async updateGasUsage(userId: string, chainId: number, amount: number): Promise<void> {
    await db
      .update(gasPolicies)
      .set({
        monthlyUsed: sql`${gasPolicies.monthlyUsed} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(gasPolicies.userId, userId),
          eq(gasPolicies.chainId, chainId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
