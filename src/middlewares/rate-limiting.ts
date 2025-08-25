/**
 * Rate Limiting Middleware
 * Prevents API abuse and spam by limiting requests per IP address
 */

import { Context, Next } from 'koa';

interface RateLimitConfig {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (ctx: Context) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimiting = (config: RateLimitConfig = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 5, // 5 requests per 15 minutes
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (ctx: Context) => ctx.ip || 'unknown'
  } = config;

  const store: RateLimitStore = {};

  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach(key => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  }, 5 * 60 * 1000);

  return async (ctx: Context, next: Next) => {
    // Only apply to newsletter subscription endpoints
    if (!ctx.request.url.includes('/newsletter-subscription')) {
      return await next();
    }

    // Only limit POST requests (subscriptions)
    if (ctx.request.method !== 'POST') {
      return await next();
    }

    const key = keyGenerator(ctx);
    const now = Date.now();
    
    // Initialize or reset if window expired
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    // Check if limit exceeded
    if (store[key].count >= maxRequests) {
      const resetTime = new Date(store[key].resetTime);
      
      ctx.status = 429;
      ctx.set('X-RateLimit-Limit', maxRequests.toString());
      ctx.set('X-RateLimit-Remaining', '0');
      ctx.set('X-RateLimit-Reset', store[key].resetTime.toString());
      ctx.set('Retry-After', Math.ceil((store[key].resetTime - now) / 1000).toString());
      
      ctx.body = {
        error: {
          status: 429,
          name: 'TooManyRequestsError',
          message: 'Too many subscription requests. Please try again later.',
          details: {
            limit: maxRequests,
            windowMs,
            resetTime: resetTime.toISOString(),
            retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
          }
        }
      };
      return;
    }

    // Increment counter before processing request
    store[key].count++;

    try {
      await next();
      
      // If skipSuccessfulRequests is true and request was successful, decrement
      if (skipSuccessfulRequests && ctx.status >= 200 && ctx.status < 300) {
        store[key].count--;
      }
    } catch (error) {
      // If skipFailedRequests is true and request failed, decrement
      if (skipFailedRequests) {
        store[key].count--;
      }
      throw error;
    }

    // Set rate limit headers
    ctx.set('X-RateLimit-Limit', maxRequests.toString());
    ctx.set('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count).toString());
    ctx.set('X-RateLimit-Reset', store[key].resetTime.toString());
  };
};

export default rateLimiting;
export { RateLimitConfig };