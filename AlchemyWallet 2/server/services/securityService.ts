/**
 * Security Service - Enhanced Security Measures
 * 
 * This service implements comprehensive security protections including
 * advanced rate limiting, input validation, and vulnerability prevention.
 */

import { Request, Response, NextFunction } from 'express';
import { monitoringService } from './monitoringService';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

interface SecurityConfig {
  maxRequestSize: number;
  allowedOrigins: string[];
  csrfTokens: Set<string>;
  blockedIPs: Set<string>;
  suspiciousPatterns: RegExp[];
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

export class SecurityService {
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private slidingWindowStore: Map<string, number[]> = new Map();
  private config: SecurityConfig;
  private rateLimitConfigs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    this.config = {
      maxRequestSize: 50 * 1024 * 1024, // 50MB
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://your-domain.com',
        // Add your production domains
      ],
      csrfTokens: new Set(),
      blockedIPs: new Set(),
      suspiciousPatterns: [
        /(<script[^>]*>.*?<\/script>)/gi, // XSS patterns
        /(union\s+select|drop\s+table|insert\s+into)/gi, // SQL injection
        /(\.\.\/|\.\.\\)/g, // Path traversal
        /(<iframe|<object|<embed)/gi, // Potentially dangerous tags
        /(javascript:|data:|vbscript:)/gi, // Dangerous protocols
        /(eval\(|setTimeout\(|setInterval\()/gi, // Code execution
      ],
    };

    this.initializeRateLimits();
    this.startCleanupTimer();
  }

  private initializeRateLimits() {
    // Different rate limits for different endpoint types
    this.rateLimitConfigs.set('auth', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per window
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    });

    this.rateLimitConfigs.set('api', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
    });

    this.rateLimitConfigs.set('transaction', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 transactions per minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    });

    this.rateLimitConfigs.set('gasless', {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 20, // 20 gasless transactions per 5 minutes
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    });
  }

  private startCleanupTimer() {
    // Clean up expired rate limit entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of Array.from(this.rateLimitStore.entries())) {
        if (now > entry.resetTime) {
          this.rateLimitStore.delete(key);
        }
      }

      // Clean up sliding window entries
      for (const [key, timestamps] of Array.from(this.slidingWindowStore.entries())) {
        const filtered = timestamps.filter((ts: number) => now - ts < 24 * 60 * 60 * 1000); // Keep last 24 hours
        if (filtered.length === 0) {
          this.slidingWindowStore.delete(key);
        } else {
          this.slidingWindowStore.set(key, filtered);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Advanced rate limiting with sliding window algorithm
   */
  createRateLimiter(type: string = 'api') {
    return (req: Request, res: Response, next: NextFunction) => {
      const config = this.rateLimitConfigs.get(type) || this.rateLimitConfigs.get('api')!;
      const clientId = this.getClientIdentifier(req);
      const key = `${type}:${clientId}`;

      // Check if IP is blocked
      if (this.config.blockedIPs.has(clientId.split(':')[0])) {
        monitoringService.logSecurityEvent({
          type: 'unauthorized_access',
          ipAddress: clientId.split(':')[0],
          details: { reason: 'Blocked IP attempted access', endpoint: req.path },
          severity: 'high',
        });

        return res.status(403).json({ message: 'Access forbidden' });
      }

      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get or create sliding window
      let timestamps = this.slidingWindowStore.get(key) || [];
      timestamps = timestamps.filter(ts => ts > windowStart);

      // Check rate limit
      if (timestamps.length >= config.maxRequests) {
        monitoringService.logSecurityEvent({
          type: 'rate_limit_exceeded',
          ipAddress: clientId.split(':')[0],
          details: { 
            endpoint: req.path, 
            requestCount: timestamps.length,
            windowMs: config.windowMs,
            maxRequests: config.maxRequests,
          },
          severity: 'medium',
        });

        return res.status(429).json({
          message: 'Too many requests',
          retryAfter: Math.ceil(config.windowMs / 1000),
        });
      }

      // Add current timestamp
      timestamps.push(now);
      this.slidingWindowStore.set(key, timestamps);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': (config.maxRequests - timestamps.length).toString(),
        'X-RateLimit-Reset': new Date(windowStart + config.windowMs).toISOString(),
      });

      next();
    };
  }

  /**
   * Input validation and sanitization middleware
   */
  validateInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check request size
        const contentLength = parseInt(req.get('content-length') || '0');
        if (contentLength > this.config.maxRequestSize) {
          monitoringService.logSecurityEvent({
            type: 'suspicious_transaction',
            details: { 
              reason: 'Request size exceeded limit',
              contentLength,
              maxAllowed: this.config.maxRequestSize,
            },
            severity: 'medium',
          });

          return res.status(413).json({ message: 'Request entity too large' });
        }

        // Validate and sanitize input data
        if (req.body) {
          this.sanitizeObject(req.body, req.path);
        }

        if (req.query) {
          this.sanitizeObject(req.query, req.path);
        }

        if (req.params) {
          this.sanitizeObject(req.params, req.path);
        }

        next();
      } catch (error) {
        monitoringService.logSecurityEvent({
          type: 'invalid_signature',
          details: { 
            reason: 'Input validation failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            path: req.path,
          },
          severity: 'high',
        });

        res.status(400).json({ message: 'Invalid input data' });
      }
    };
  }

  private sanitizeObject(obj: any, path: string): void {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Check for suspicious patterns
        for (const pattern of this.config.suspiciousPatterns) {
          if (pattern.test(value)) {
            monitoringService.logSecurityEvent({
              type: 'suspicious_transaction',
              details: { 
                reason: 'Suspicious pattern detected in input',
                field: key,
                pattern: pattern.source,
                path,
              },
              severity: 'high',
            });

            throw new Error(`Suspicious pattern detected in field: ${key}`);
          }
        }

        // Basic HTML encoding for XSS prevention
        obj[key] = value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      } else if (typeof value === 'object' && value !== null) {
        this.sanitizeObject(value, path);
      }
    }
  }

  /**
   * CORS and security headers middleware
   */
  securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.get('Origin');
      
      // CORS handling
      if (origin && this.config.allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
      }

      // Security headers
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      });

      next();
    };
  }

  /**
   * Reentrancy protection for financial operations
   */
  reentrancyGuard() {
    const activeOperations = new Set<string>();

    return (req: Request, res: Response, next: NextFunction) => {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return next();

      const operationKey = `${userId}:${req.path}`;

      if (activeOperations.has(operationKey)) {
        monitoringService.logSecurityEvent({
          type: 'suspicious_transaction',
          userId,
          details: { 
            reason: 'Reentrancy attempt detected',
            operation: req.path,
          },
          severity: 'high',
        });

        return res.status(409).json({ message: 'Operation already in progress' });
      }

      activeOperations.add(operationKey);

      // Remove operation from active set when response finishes
      res.on('finish', () => {
        activeOperations.delete(operationKey);
      });

      res.on('close', () => {
        activeOperations.delete(operationKey);
      });

      next();
    };
  }

  /**
   * Signature validation for sensitive operations
   */
  validateSignature() {
    return (req: Request, res: Response, next: NextFunction) => {
      const signature = req.get('X-Signature');
      const timestamp = req.get('X-Timestamp');
      const nonce = req.get('X-Nonce');

      if (!signature || !timestamp || !nonce) {
        return res.status(401).json({ message: 'Missing signature headers' });
      }

      // Check timestamp freshness (5 minutes)
      const now = Date.now();
      const requestTime = parseInt(timestamp);
      if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
        monitoringService.logSecurityEvent({
          type: 'invalid_signature',
          details: { 
            reason: 'Request timestamp too old',
            timestamp: requestTime,
            now,
          },
          severity: 'medium',
        });

        return res.status(401).json({ message: 'Request timestamp invalid' });
      }

      // In production, implement proper signature validation
      // This is a simplified example
      const expectedSignature = this.generateSignature(req.body, timestamp, nonce);
      if (signature !== expectedSignature) {
        monitoringService.logSecurityEvent({
          type: 'invalid_signature',
          details: { 
            reason: 'Signature verification failed',
            provided: signature,
            expected: expectedSignature,
          },
          severity: 'high',
        });

        return res.status(401).json({ message: 'Invalid signature' });
      }

      next();
    };
  }

  private generateSignature(body: any, timestamp: string, nonce: string): string {
    // Simplified signature generation
    // In production, use HMAC-SHA256 with a secret key
    const data = JSON.stringify(body) + timestamp + nonce;
    return Buffer.from(data).toString('base64');
  }

  private getClientIdentifier(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';
    return `${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 16)}`;
  }

  /**
   * Block an IP address
   */
  blockIP(ip: string, reason: string): void {
    this.config.blockedIPs.add(ip);
    
    monitoringService.logSecurityEvent({
      type: 'unauthorized_access',
      ipAddress: ip,
      details: { reason: `IP blocked: ${reason}` },
      severity: 'high',
    });

    console.log(`Blocked IP: ${ip} - Reason: ${reason}`);
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ip: string): void {
    this.config.blockedIPs.delete(ip);
    console.log(`Unblocked IP: ${ip}`);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    blockedIPs: number;
    activeRateLimits: number;
    recentSecurityEvents: number;
  } {
    const recentEvents = monitoringService.getSecurityEvents(undefined, undefined, 60 * 60 * 1000); // Last hour
    
    return {
      blockedIPs: this.config.blockedIPs.size,
      activeRateLimits: this.rateLimitStore.size,
      recentSecurityEvents: recentEvents.length,
    };
  }
}

export const securityService = new SecurityService();