/**
 * Request Logging Middleware
 * Logs requests for monitoring, security, and debugging purposes
 */

import { Context, Next } from 'koa';

// Extend Koa Context to include Strapi request body
interface StrapiContext extends Context {
  request: Context['request'] & {
    body?: any;
  };
}

interface LoggingConfig {
  logLevel?: 'info' | 'warn' | 'error' | 'debug';
  logSuccessfulRequests?: boolean;
  logFailedRequests?: boolean;
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  sensitiveFields?: string[];
  maxBodyLength?: number;
}

const requestLogging = (config: LoggingConfig = {}) => {
  const {
    logLevel = 'info',
    logSuccessfulRequests = true,
    logFailedRequests = true,
    logRequestBody = false,
    logResponseBody = false,
    sensitiveFields = ['password', 'token', 'apiKey', 'secret'],
    maxBodyLength = 1000
  } = config;

  // Sanitize sensitive data from objects
  const sanitizeData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  };

  // Truncate long strings
  const truncateString = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...[truncated]';
  };

  // Format log data
  const formatLogData = (data: any): string => {
    try {
      const sanitized = sanitizeData(data);
      const jsonString = JSON.stringify(sanitized, null, 2);
      return truncateString(jsonString, maxBodyLength);
    } catch (error) {
      return '[Unable to serialize data]';
    }
  };

  return async (ctx: StrapiContext, next: Next) => {
    // Only apply to newsletter subscription endpoints
    if (!ctx.request.url.includes('/newsletter-subscription')) {
      return await next();
    }

    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    
    // Log request start
    const requestInfo = {
      requestId,
      method: ctx.request.method,
      url: ctx.request.url,
      userAgent: ctx.request.headers['user-agent'],
      ip: ctx.ip,
      timestamp: new Date().toISOString(),
      referer: ctx.request.headers.referer
    };

    console.log(`[${logLevel.toUpperCase()}] Newsletter Subscription Request Started:`, {
      ...requestInfo,
      body: logRequestBody ? formatLogData(ctx.request.body) : '[Body logging disabled]'
    });

    let responseData: any = null;
    let error: any = null;

    try {
      await next();
      
      // Capture response if logging is enabled
      if (logResponseBody && ctx.body) {
        responseData = ctx.body;
      }
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const logData = {
        ...requestInfo,
        status: ctx.status,
        duration: `${duration}ms`,
        responseSize: ctx.length || 0
      };

      // Log successful requests
      if (!error && logSuccessfulRequests) {
        if (ctx.status >= 200 && ctx.status < 300) {
          console.log(`[${logLevel.toUpperCase()}] Newsletter Subscription Request Completed:`, {
            ...logData,
            response: logResponseBody ? formatLogData(responseData) : '[Response logging disabled]'
          });
        } else if (ctx.status >= 400) {
          // console.warn(`[WARN] Newsletter Subscription Request Failed:`, {
          //   ...logData,
          //   response: formatLogData(responseData)
          // });
        }
      }

      // Log failed requests
      if (error && logFailedRequests) {
        console.error(`[ERROR] Newsletter Subscription Request Error:`, {
          ...logData,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          response: formatLogData(responseData)
        });
      }

      // Log suspicious activity
      if (ctx.status === 429) {
        // console.warn(`[SECURITY] Rate limit exceeded for newsletter subscription:`, {
        //   ...requestInfo,
        //   rateLimitHeaders: {
        //     limit: ctx.response.headers['x-ratelimit-limit'],
        //     remaining: ctx.response.headers['x-ratelimit-remaining'],
        //     reset: ctx.response.headers['x-ratelimit-reset']
        //   }
        // });
      }

      if (ctx.status === 400 && (ctx.body as any)?.error?.name === 'ValidationError') {
        // console.warn(`[SECURITY] Invalid input detected for newsletter subscription:`, {
        //   ...requestInfo,
        //   validationErrors: (ctx.body as any).error.details?.errors || []
        // });
      }

      if (ctx.status === 409) {
        console.info(`[INFO] Duplicate subscription attempt:`, {
          ...requestInfo,
          email: ctx.request.body?.data?.email || ctx.request.body?.email || '[email not found]'
        });
      }
    }
  };
};

export default requestLogging;
export { LoggingConfig };