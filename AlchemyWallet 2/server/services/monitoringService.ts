/**
 * Monitoring and Performance Tracking Service
 * 
 * This service provides monitoring capabilities for gasless transactions,
 * performance metrics, and security monitoring.
 */

interface TransactionMetrics {
  transactionHash: string;
  chainId: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  gasEstimate?: string;
  actualGasUsed?: string;
  sponsored: boolean;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
}

interface SecurityEvent {
  type: 'suspicious_transaction' | 'rate_limit_exceeded' | 'invalid_signature' | 'unauthorized_access';
  userId?: string;
  ipAddress?: string;
  timestamp: number;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: number;
  userId?: string;
}

export class MonitoringService {
  private transactionMetrics: Map<string, TransactionMetrics> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private readonly MAX_EVENTS = 10000; // Keep last 10k events in memory

  /**
   * Start tracking a transaction
   */
  startTransactionTracking(transactionData: {
    hash: string;
    chainId: number;
    gasEstimate?: string;
    sponsored: boolean;
  }): void {
    this.transactionMetrics.set(transactionData.hash, {
      transactionHash: transactionData.hash,
      chainId: transactionData.chainId,
      startTime: Date.now(),
      gasEstimate: transactionData.gasEstimate,
      sponsored: transactionData.sponsored,
      status: 'pending',
    });

    console.log(`[MONITOR] Started tracking transaction: ${transactionData.hash}`);
  }

  /**
   * Complete transaction tracking
   */
  completeTransactionTracking(
    transactionHash: string,
    status: 'success' | 'failed',
    actualGasUsed?: string,
    errorMessage?: string
  ): void {
    const metrics = this.transactionMetrics.get(transactionHash);
    if (!metrics) {
      console.warn(`[MONITOR] No tracking data found for transaction: ${transactionHash}`);
      return;
    }

    const endTime = Date.now();
    const updatedMetrics = {
      ...metrics,
      endTime,
      duration: endTime - metrics.startTime,
      actualGasUsed,
      status,
      errorMessage,
    };

    this.transactionMetrics.set(transactionHash, updatedMetrics);

    // Log performance metrics
    console.log(`[MONITOR] Transaction ${transactionHash} completed:`, {
      duration: updatedMetrics.duration,
      status,
      sponsored: metrics.sponsored,
      gasEfficiency: this.calculateGasEfficiency(metrics.gasEstimate, actualGasUsed),
    });

    // Check for performance issues
    if (updatedMetrics.duration > 30000) { // 30 seconds
      this.logSecurityEvent({
        type: 'suspicious_transaction',
        timestamp: Date.now(),
        details: { 
          transactionHash, 
          duration: updatedMetrics.duration,
          reason: 'Long transaction processing time'
        },
        severity: 'medium',
      });
    }
  }

  /**
   * Log a security event
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'> & { timestamp?: number }): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    };

    this.securityEvents.push(securityEvent);

    // Keep only recent events
    if (this.securityEvents.length > this.MAX_EVENTS) {
      this.securityEvents.shift();
    }

    // Log based on severity
    const logLevel = securityEvent.severity === 'critical' ? 'error' 
                  : securityEvent.severity === 'high' ? 'warn' 
                  : 'info';

    console[logLevel](`[SECURITY-${securityEvent.severity.toUpperCase()}] ${securityEvent.type}:`, securityEvent.details);

    // In production, this would send alerts for high/critical events
    if (securityEvent.severity === 'critical' || securityEvent.severity === 'high') {
      this.sendAlert(securityEvent);
    }
  }

  /**
   * Track API performance
   */
  trackApiPerformance(metrics: PerformanceMetrics): void {
    this.performanceMetrics.push(metrics);

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.MAX_EVENTS) {
      this.performanceMetrics.shift();
    }

    // Log slow requests
    if (metrics.duration > 5000) { // 5 seconds
      console.warn(`[PERFORMANCE] Slow API request:`, {
        endpoint: metrics.endpoint,
        duration: metrics.duration,
        statusCode: metrics.statusCode,
      });
    }
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats(timeframe: number = 24 * 60 * 60 * 1000): {
    total: number;
    sponsored: number;
    failed: number;
    averageDuration: number;
    gasEfficiency: number;
  } {
    const cutoff = Date.now() - timeframe;
    const recentTransactions = Array.from(this.transactionMetrics.values())
      .filter(tx => tx.startTime > cutoff && tx.endTime);

    const sponsored = recentTransactions.filter(tx => tx.sponsored).length;
    const failed = recentTransactions.filter(tx => tx.status === 'failed').length;
    const totalDuration = recentTransactions.reduce((sum, tx) => sum + (tx.duration || 0), 0);
    const averageDuration = recentTransactions.length > 0 ? totalDuration / recentTransactions.length : 0;

    // Calculate average gas efficiency
    const gasEfficiencies = recentTransactions
      .map(tx => this.calculateGasEfficiency(tx.gasEstimate, tx.actualGasUsed))
      .filter(eff => eff !== null);
    const gasEfficiency = gasEfficiencies.length > 0 
      ? gasEfficiencies.reduce((sum, eff) => sum + eff!, 0) / gasEfficiencies.length 
      : 0;

    return {
      total: recentTransactions.length,
      sponsored,
      failed,
      averageDuration,
      gasEfficiency,
    };
  }

  /**
   * Get security events by type and timeframe
   */
  getSecurityEvents(
    type?: SecurityEvent['type'], 
    severity?: SecurityEvent['severity'],
    timeframe: number = 24 * 60 * 60 * 1000
  ): SecurityEvent[] {
    const cutoff = Date.now() - timeframe;
    
    return this.securityEvents.filter(event => {
      if (event.timestamp < cutoff) return false;
      if (type && event.type !== type) return false;
      if (severity && event.severity !== severity) return false;
      return true;
    });
  }

  /**
   * Get API performance metrics
   */
  getApiPerformanceStats(timeframe: number = 24 * 60 * 60 * 1000): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowRequestsCount: number;
  } {
    const cutoff = Date.now() - timeframe;
    const recentMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff);

    const totalRequests = recentMetrics.length;
    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageResponseTime = totalRequests > 0 ? totalDuration / totalRequests : 0;
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
    const slowRequestsCount = recentMetrics.filter(m => m.duration > 5000).length;

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      slowRequestsCount,
    };
  }

  /**
   * Health check endpoint data
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    metrics: {
      transactions: {
        total: number;
        sponsored: number;
        failed: number;
        averageDuration: number;
        gasEfficiency: number;
      };
      api: {
        totalRequests: number;
        averageResponseTime: number;
        errorRate: number;
        slowRequestsCount: number;
      };
      securityEvents: number;
    };
  } {
    const transactionStats = this.getTransactionStats();
    const apiStats = this.getApiPerformanceStats();
    const criticalSecurityEvents = this.getSecurityEvents(undefined, 'critical', 60 * 60 * 1000).length;

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (criticalSecurityEvents > 0 || apiStats.errorRate > 50 || transactionStats.failed > transactionStats.total * 0.5) {
      status = 'unhealthy';
    } else if (apiStats.errorRate > 10 || apiStats.slowRequestsCount > 10 || transactionStats.failed > transactionStats.total * 0.1) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      metrics: {
        transactions: transactionStats,
        api: apiStats,
        securityEvents: this.getSecurityEvents().length,
      },
    };
  }

  private calculateGasEfficiency(estimated?: string, actual?: string): number | null {
    if (!estimated || !actual) return null;
    
    const est = parseFloat(estimated);
    const act = parseFloat(actual);
    
    if (est === 0) return null;
    
    return (est - act) / est * 100; // Percentage of gas saved/wasted
  }

  private sendAlert(event: SecurityEvent): void {
    // In production, this would integrate with alerting systems like:
    // - Slack/Discord webhooks
    // - Email notifications
    // - PagerDuty/OpsGenie
    // - Monitoring services like DataDog/New Relic
    
    console.error(`[ALERT] Critical security event: ${event.type}`, event);
  }
}

export const monitoringService = new MonitoringService();