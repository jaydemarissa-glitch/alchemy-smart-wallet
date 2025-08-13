import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Smart wallet accounts table
export const smartWallets = pgTable("smart_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  address: varchar("address").notNull().unique(),
  chainId: integer("chain_id").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assets/tokens table
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractAddress: varchar("contract_address"),
  chainId: integer("chain_id").notNull(),
  symbol: varchar("symbol").notNull(),
  name: varchar("name").notNull(),
  decimals: integer("decimals").notNull().default(18),
  logoUrl: varchar("logo_url"),
  isNative: boolean("is_native").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User token balances table
export const tokenBalances = pgTable("token_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  walletId: varchar("wallet_id").notNull().references(() => smartWallets.id, { onDelete: "cascade" }),
  assetId: varchar("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 36, scale: 18 }).notNull().default('0'),
  usdValue: decimal("usd_value", { precision: 12, scale: 2 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  walletId: varchar("wallet_id").notNull().references(() => smartWallets.id, { onDelete: "cascade" }),
  hash: varchar("hash").notNull().unique(),
  chainId: integer("chain_id").notNull(),
  type: varchar("type").notNull(), // send, receive, swap, bridge
  status: varchar("status").notNull().default('pending'), // pending, confirmed, failed
  fromAddress: varchar("from_address"),
  toAddress: varchar("to_address"),
  amount: decimal("amount", { precision: 36, scale: 18 }),
  assetId: varchar("asset_id").references(() => assets.id),
  gasUsed: decimal("gas_used", { precision: 20, scale: 0 }),
  gasSponsor: boolean("gas_sponsor").default(false),
  blockNumber: integer("block_number"),
  metadata: jsonb("metadata"), // Additional transaction data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gas sponsorship policies table
export const gasPolicies = pgTable("gas_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chainId: integer("chain_id").notNull(),
  isActive: boolean("is_active").default(true),
  monthlyLimit: decimal("monthly_limit", { precision: 12, scale: 2 }).notNull(),
  monthlyUsed: decimal("monthly_used", { precision: 12, scale: 2 }).default('0'),
  perTransactionLimit: decimal("per_transaction_limit", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  smartWallets: many(smartWallets),
  tokenBalances: many(tokenBalances),
  transactions: many(transactions),
  gasPolicies: many(gasPolicies),
}));

export const smartWalletsRelations = relations(smartWallets, ({ one, many }) => ({
  user: one(users, {
    fields: [smartWallets.userId],
    references: [users.id],
  }),
  tokenBalances: many(tokenBalances),
  transactions: many(transactions),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  tokenBalances: many(tokenBalances),
  transactions: many(transactions),
}));

export const tokenBalancesRelations = relations(tokenBalances, ({ one }) => ({
  user: one(users, {
    fields: [tokenBalances.userId],
    references: [users.id],
  }),
  wallet: one(smartWallets, {
    fields: [tokenBalances.walletId],
    references: [smartWallets.id],
  }),
  asset: one(assets, {
    fields: [tokenBalances.assetId],
    references: [assets.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  wallet: one(smartWallets, {
    fields: [transactions.walletId],
    references: [smartWallets.id],
  }),
  asset: one(assets, {
    fields: [transactions.assetId],
    references: [assets.id],
  }),
}));

export const gasPoliciesRelations = relations(gasPolicies, ({ one }) => ({
  user: one(users, {
    fields: [gasPolicies.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertSmartWalletSchema = createInsertSchema(smartWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

export const insertTokenBalanceSchema = createInsertSchema(tokenBalances).omit({
  id: true,
  lastUpdated: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGasPolicySchema = createInsertSchema(gasPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertSmartWallet = z.infer<typeof insertSmartWalletSchema>;
export type SmartWallet = typeof smartWallets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertTokenBalance = z.infer<typeof insertTokenBalanceSchema>;
export type TokenBalance = typeof tokenBalances.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertGasPolicy = z.infer<typeof insertGasPolicySchema>;
export type GasPolicy = typeof gasPolicies.$inferSelect;
