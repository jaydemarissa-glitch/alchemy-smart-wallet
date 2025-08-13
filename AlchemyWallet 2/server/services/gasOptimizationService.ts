/**
 * Gas Optimization Service - Enhanced Relayer Cost Management
 * 
 * This service provides advanced gas optimization strategies,
 * cost monitoring, and efficiency improvements for gasless transactions.
 */

import { providerService } from './providerService';
import { monitoringService } from './monitoringService';

interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCost: number;
  confidence: number;
}

interface GasOptimizationStrategy {
  name: string;
  savings: number;
  recommendation: string;
  applicable: boolean;
}

interface TransactionBatch {
  transactions: any[];
  estimatedGasSavings: number;
  batchGasLimit: string;
  executionOrder: number[];
}

interface GasAnalytics {
  averageGasPrice: number;
  medianGasPrice: number;
  peakHours: number[];
  optimalTimeWindows: { start: number; end: number; avgGasPrice: number }[];
  costTrends: { timestamp: number; gasPrice: number; cost: number }[];
}

export class GasOptimizationService {
  private gasPriceHistory: Map<number, { timestamp: number; gasPrice: number }[]> = new Map();
  private transactionQueue: Map<number, any[]> = new Map();
  private batchingEnabled: boolean = true;
  private readonly BATCH_WINDOW_MS = 30000; // 30 seconds
  private readonly MAX_BATCH_SIZE = 10;
  private readonly OPTIMAL_GAS_THRESHOLD = 0.8; // 80% of network average

  constructor() {
    this.startGasPriceTracking();
    this.startBatchProcessor();
  }

  private startGasPriceTracking() {
    // Track gas prices every 30 seconds
    setInterval(async () => {
      for (const chainId of [1, 56, 137, 8453, 42161]) {
        try {
          const gasPrice = await this.getCurrentGasPrice(chainId);
          this.recordGasPrice(chainId, gasPrice);
        } catch (error) {
          console.error(`Error tracking gas price for chain ${chainId}:`, error);
        }
      }
    }, 30000);
  }

  private startBatchProcessor() {
    // Process transaction batches every 30 seconds
    setInterval(() => {
      this.processPendingBatches();
    }, this.BATCH_WINDOW_MS);
  }

  /**
   * Get optimized gas estimate with multiple strategies
   */
  async getOptimizedGasEstimate(
    chainId: number,
    transaction: any,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<GasEstimate> {
    const baseGasPrice = await this.getCurrentGasPrice(chainId);
    const historicalData = this.getGasPriceHistory(chainId);
    
    // Calculate optimal gas price based on urgency and historical data
    let multiplier = 1.0;
    switch (urgency) {
      case 'low':
        multiplier = 0.8; // 20% below current
        break;
      case 'medium':
        multiplier = 1.0; // Current price
        break;
      case 'high':
        multiplier = 1.2; // 20% above current
        break;
    }

    // Adjust based on network congestion
    const congestionMultiplier = this.calculateCongestionMultiplier(historicalData);
    const optimizedGasPrice = Math.round(parseFloat(baseGasPrice.toString()) * multiplier * congestionMultiplier);

    // EIP-1559 support for chains that support it
    const supportsEIP1559 = [1, 137, 8453, 42161].includes(chainId);
    let maxFeePerGas: string | undefined;
    let maxPriorityFeePerGas: string | undefined;

    if (supportsEIP1559) {
      const { maxFee, priorityFee } = await this.calculateEIP1559Fees(chainId, urgency);
      maxFeePerGas = maxFee.toString();
      maxPriorityFeePerGas = priorityFee.toString();
    }

    // Estimate gas limit with buffer
    const estimatedGasLimit = await this.estimateGasLimit(chainId, transaction);
    const gasLimitWithBuffer = Math.round(estimatedGasLimit * 1.2); // 20% buffer

    const estimatedCost = (gasLimitWithBuffer * optimizedGasPrice) / 1e18; // Convert to ETH/token units

    return {
      gasLimit: gasLimitWithBuffer.toString(),
      gasPrice: optimizedGasPrice.toString(),
      maxFeePerGas,
      maxPriorityFeePerGas,
      estimatedCost,
      confidence: this.calculateConfidence(historicalData, urgency),
    };
  }

  /**
   * Analyze potential gas optimization strategies
   */
  analyzeOptimizationStrategies(transaction: any, chainId: number): GasOptimizationStrategy[] {
    const strategies: GasOptimizationStrategy[] = [];

    // Strategy 1: Transaction batching
    const pendingTxs = this.transactionQueue.get(chainId) || [];
    if (pendingTxs.length > 0 && this.batchingEnabled) {
      strategies.push({
        name: 'Transaction Batching',
        savings: this.calculateBatchingSavings(pendingTxs.length + 1),
        recommendation: `Batch with ${pendingTxs.length} pending transactions`,
        applicable: true,
      });
    }

    // Strategy 2: Optimal timing
    const currentHour = new Date().getHours();
    const isOptimalTime = this.isOptimalGasTime(chainId, currentHour);
    if (!isOptimalTime) {
      const nextOptimalWindow = this.getNextOptimalWindow(chainId);
      strategies.push({
        name: 'Optimal Timing',
        savings: 15, // Estimated 15% savings
        recommendation: `Wait until ${nextOptimalWindow.start}:00 for lower gas prices`,
        applicable: true,
      });
    }

    // Strategy 3: Gas token optimization (for supported chains)
    if ([1, 56].includes(chainId)) {
      strategies.push({
        name: 'Gas Token Usage',
        savings: 25, // Up to 25% savings with gas tokens
        recommendation: 'Use CHI or GST2 tokens to reduce gas costs',
        applicable: this.hasGasTokens(transaction.from),
      });
    }

    // Strategy 4: Contract optimization
    const contractOptimization = this.analyzeContractInteraction(transaction);
    if (contractOptimization.applicable) {
      strategies.push(contractOptimization);
    }

    return strategies;
  }

  /**
   * Create optimized transaction batch
   */
  async createOptimizedBatch(transactions: any[], chainId: number): Promise<TransactionBatch> {
    // Sort transactions by gas price efficiency
    const sortedTxs = transactions.sort((a, b) => {
      const efficiencyA = this.calculateTransactionEfficiency(a);
      const efficiencyB = this.calculateTransactionEfficiency(b);
      return efficiencyB - efficiencyA;
    });

    // Calculate optimal batch size
    const optimalBatchSize = Math.min(sortedTxs.length, this.MAX_BATCH_SIZE);
    const batchTransactions = sortedTxs.slice(0, optimalBatchSize);

    // Estimate gas savings from batching
    const individualGasCosts = batchTransactions.map(tx => this.estimateIndividualGasCost(tx));
    const totalIndividualCost = individualGasCosts.reduce((sum, cost) => sum + cost, 0);
    const batchGasCost = await this.estimateBatchGasCost(batchTransactions, chainId);
    const estimatedGasSavings = totalIndividualCost - batchGasCost;

    // Determine optimal execution order
    const executionOrder = this.optimizeExecutionOrder(batchTransactions);

    return {
      transactions: batchTransactions,
      estimatedGasSavings,
      batchGasLimit: batchGasCost.toString(),
      executionOrder,
    };
  }

  /**
   * Get gas analytics and trends
   */
  getGasAnalytics(chainId: number, timeframe: number = 24 * 60 * 60 * 1000): GasAnalytics {
    const history = this.getGasPriceHistory(chainId, timeframe);
    
    if (history.length === 0) {
      return {
        averageGasPrice: 0,
        medianGasPrice: 0,
        peakHours: [],
        optimalTimeWindows: [],
        costTrends: [],
      };
    }

    // Calculate statistics
    const gasPrices = history.map(h => h.gasPrice);
    const averageGasPrice = gasPrices.reduce((sum, price) => sum + price, 0) / gasPrices.length;
    const sortedPrices = [...gasPrices].sort((a, b) => a - b);
    const medianGasPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

    // Identify peak hours (high gas price hours)
    const hourlyStats = this.calculateHourlyStats(history);
    const peakHours = Object.entries(hourlyStats)
      .filter(([, stats]) => stats.averagePrice > averageGasPrice * 1.2)
      .map(([hour]) => parseInt(hour));

    // Find optimal time windows (low gas price periods)
    const optimalTimeWindows = this.findOptimalTimeWindows(hourlyStats, averageGasPrice);

    // Generate cost trends
    const costTrends = history.map(h => ({
      timestamp: h.timestamp,
      gasPrice: h.gasPrice,
      cost: (h.gasPrice * 21000) / 1e18, // Standard transfer cost
    }));

    return {
      averageGasPrice,
      medianGasPrice,
      peakHours,
      optimalTimeWindows,
      costTrends,
    };
  }

  /**
   * Monitor and optimize ongoing transactions
   */
  async optimizeOngoingTransaction(txHash: string, chainId: number): Promise<{
    canOptimize: boolean;
    recommendations: string[];
    potentialSavings: number;
  }> {
    const recommendations: string[] = [];
    let potentialSavings = 0;

    try {
      // Get transaction details
      const tx = await providerService.executeWithFallback(
        chainId,
        async (client) => await client.core.getTransaction(txHash),
        `getTransaction(${txHash})`
      );

      if (!tx) {
        return { canOptimize: false, recommendations: [], potentialSavings: 0 };
      }

      // Check if transaction is still pending
      if (tx.blockNumber === null) {
        const currentGasPrice = await this.getCurrentGasPrice(chainId);
        const txGasPrice = parseInt(tx.gasPrice?.toString() || '0');

        // Check if gas price can be optimized
        if (txGasPrice > currentGasPrice * 1.1) {
          recommendations.push('Current gas price has decreased. Consider replacing with lower gas price.');
          potentialSavings = ((txGasPrice - currentGasPrice) * parseInt(tx.gasLimit?.toString() || '0')) / 1e18;
        }

        // Check for potential acceleration
        if (Date.now() - (tx.timestamp || 0) * 1000 > 300000) { // 5 minutes
          recommendations.push('Transaction has been pending for over 5 minutes. Consider gas price acceleration.');
        }
      }

      return {
        canOptimize: recommendations.length > 0,
        recommendations,
        potentialSavings,
      };
    } catch (error) {
      console.error('Error optimizing ongoing transaction:', error);
      return { canOptimize: false, recommendations: [], potentialSavings: 0 };
    }
  }

  // Private helper methods

  private async getCurrentGasPrice(chainId: number): Promise<number> {
    try {
      const gasPrice = await providerService.executeWithFallback(
        chainId,
        async (client) => await client.core.getGasPrice(),
        `getGasPrice(${chainId})`
      );
      return parseInt(gasPrice.toString());
    } catch (error) {
      console.error(`Error getting gas price for chain ${chainId}:`, error);
      return 20000000000; // Fallback to 20 gwei
    }
  }

  private recordGasPrice(chainId: number, gasPrice: number) {
    const history = this.gasPriceHistory.get(chainId) || [];
    history.push({ timestamp: Date.now(), gasPrice });
    
    // Keep only last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = history.filter(h => h.timestamp > cutoff);
    
    this.gasPriceHistory.set(chainId, filtered);
  }

  private getGasPriceHistory(chainId: number, timeframe?: number): { timestamp: number; gasPrice: number }[] {
    const history = this.gasPriceHistory.get(chainId) || [];
    if (!timeframe) return history;
    
    const cutoff = Date.now() - timeframe;
    return history.filter(h => h.timestamp > cutoff);
  }

  private calculateCongestionMultiplier(history: { timestamp: number; gasPrice: number }[]): number {
    if (history.length < 10) return 1.0;

    const recent = history.slice(-10);
    const average = recent.reduce((sum, h) => sum + h.gasPrice, 0) / recent.length;
    const current = recent[recent.length - 1].gasPrice;

    return Math.min(1.5, Math.max(0.8, current / average));
  }

  private async calculateEIP1559Fees(chainId: number, urgency: string): Promise<{ maxFee: number; priorityFee: number }> {
    // Simplified EIP-1559 calculation
    const baseFee = await this.getCurrentGasPrice(chainId);
    
    let priorityFee: number;
    switch (urgency) {
      case 'low':
        priorityFee = Math.round(baseFee * 0.05); // 5% of base fee
        break;
      case 'medium':
        priorityFee = Math.round(baseFee * 0.1); // 10% of base fee
        break;
      case 'high':
        priorityFee = Math.round(baseFee * 0.2); // 20% of base fee
        break;
      default:
        priorityFee = Math.round(baseFee * 0.1);
    }

    const maxFee = baseFee + priorityFee;

    return { maxFee, priorityFee };
  }

  private async estimateGasLimit(chainId: number, transaction: any): Promise<number> {
    // Simplified gas estimation
    // In production, this would use the actual provider's estimateGas method
    return 21000; // Standard transfer
  }

  private calculateConfidence(history: { timestamp: number; gasPrice: number }[], urgency: string): number {
    if (history.length < 5) return 0.5; // Low confidence with limited data

    const variance = this.calculateVariance(history.map(h => h.gasPrice));
    const normalizedVariance = Math.min(1, variance / 10000000000); // Normalize to 0-1

    let baseConfidence = 1 - normalizedVariance;
    
    // Adjust based on urgency
    if (urgency === 'high') baseConfidence *= 0.9; // Slightly lower confidence for urgent transactions
    
    return Math.max(0.1, Math.min(1, baseConfidence));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / values.length;
  }

  private calculateBatchingSavings(batchSize: number): number {
    // Estimated savings from batching (overhead reduction)
    return Math.min(40, batchSize * 5); // Up to 40% savings
  }

  private isOptimalGasTime(chainId: number, hour: number): boolean {
    // Simplified optimal time calculation
    // Typically, gas prices are lower during off-peak hours
    const offPeakHours = [2, 3, 4, 5, 6, 7, 8]; // Early morning hours
    return offPeakHours.includes(hour);
  }

  private getNextOptimalWindow(chainId: number): { start: number; end: number } {
    const currentHour = new Date().getHours();
    const nextOptimalStart = currentHour < 2 ? 2 : 26; // Next 2 AM
    return { start: nextOptimalStart, end: nextOptimalStart + 6 };
  }

  private hasGasTokens(address: string): boolean {
    // Simplified check - in production, query the blockchain
    return false;
  }

  private analyzeContractInteraction(transaction: any): GasOptimizationStrategy {
    // Simplified contract analysis
    return {
      name: 'Contract Optimization',
      savings: 10,
      recommendation: 'Use optimized contract methods',
      applicable: false,
    };
  }

  private calculateTransactionEfficiency(transaction: any): number {
    // Simplified efficiency calculation
    return Math.random(); // Placeholder
  }

  private estimateIndividualGasCost(transaction: any): number {
    // Simplified individual cost estimation
    return 21000; // Standard transfer cost
  }

  private async estimateBatchGasCost(transactions: any[], chainId: number): Promise<number> {
    // Simplified batch cost estimation
    const individualCosts = transactions.length * 21000;
    const batchOverhead = 50000; // Fixed overhead for batching
    return Math.max(individualCosts * 0.8, batchOverhead); // 20% savings minus overhead
  }

  private optimizeExecutionOrder(transactions: any[]): number[] {
    // Simple execution order optimization
    return transactions.map((_, index) => index);
  }

  private calculateHourlyStats(history: { timestamp: number; gasPrice: number }[]): Record<number, { averagePrice: number; count: number }> {
    const hourlyData: Record<number, number[]> = {};

    history.forEach(h => {
      const hour = new Date(h.timestamp).getHours();
      if (!hourlyData[hour]) hourlyData[hour] = [];
      hourlyData[hour].push(h.gasPrice);
    });

    const stats: Record<number, { averagePrice: number; count: number }> = {};
    Object.entries(hourlyData).forEach(([hour, prices]) => {
      stats[parseInt(hour)] = {
        averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
        count: prices.length,
      };
    });

    return stats;
  }

  private findOptimalTimeWindows(hourlyStats: Record<number, { averagePrice: number; count: number }>, averageGasPrice: number): { start: number; end: number; avgGasPrice: number }[] {
    const windows: { start: number; end: number; avgGasPrice: number }[] = [];
    
    Object.entries(hourlyStats).forEach(([hour, stats]) => {
      if (stats.averagePrice < averageGasPrice * 0.8) { // 20% below average
        windows.push({
          start: parseInt(hour),
          end: parseInt(hour) + 1,
          avgGasPrice: stats.averagePrice,
        });
      }
    });

    return windows;
  }

  private async processPendingBatches() {
    for (const [chainId, transactions] of Array.from(this.transactionQueue.entries())) {
      if (transactions.length >= 2) {
        try {
          const batch = await this.createOptimizedBatch(transactions, chainId);
          
          monitoringService.logSecurityEvent({
            type: 'suspicious_transaction',
            details: {
              reason: 'Transaction batch processed',
              chainId,
              batchSize: batch.transactions.length,
              estimatedSavings: batch.estimatedGasSavings,
            },
            severity: 'low',
          });

          // Clear processed transactions
          this.transactionQueue.set(chainId, []);
        } catch (error) {
          console.error(`Error processing batch for chain ${chainId}:`, error);
        }
      }
    }
  }
}

export const gasOptimizationService = new GasOptimizationService();