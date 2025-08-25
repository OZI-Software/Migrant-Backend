/**
 * Input Sanitization Middleware
 * Sanitizes user input to prevent XSS attacks and malicious content
 */

import { Context, Next } from 'koa';

interface SanitizationConfig {
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxLength?: {
    email?: number;
    fullname?: number;
    [key: string]: number | undefined;
  };
}

const inputSanitization = (config: SanitizationConfig = {}) => {
  const {
    allowedTags = [],
    allowedAttributes = [],
    maxLength = {
      email: 254, // RFC 5321 limit
      fullname: 100
    }
  } = config;

  // HTML entity encoding map
  const htmlEntities: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  // Sanitize string by removing/encoding dangerous characters
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    
    // Remove null bytes
    str = str.replace(/\0/g, '');
    
    // Remove control characters except tab, newline, and carriage return
    str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Encode HTML entities
    str = str.replace(/[&<>"'\/]/g, (match) => htmlEntities[match] || match);
    
    // Remove potentially dangerous patterns
    str = str.replace(/javascript:/gi, '');
    str = str.replace(/vbscript:/gi, '');
    str = str.replace(/on\w+\s*=/gi, '');
    str = str.replace(/<script[^>]*>.*?<\/script>/gi, '');
    str = str.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    str = str.replace(/<object[^>]*>.*?<\/object>/gi, '');
    str = str.replace(/<embed[^>]*>/gi, '');
    str = str.replace(/<link[^>]*>/gi, '');
    str = str.replace(/<meta[^>]*>/gi, '');
    
    return str.trim();
  };

  // Validate string length
  const validateLength = (str: string, field: string, maxLen?: number): string | null => {
    if (!maxLen) return null;
    
    if (str.length > maxLen) {
      return `${field} exceeds maximum length of ${maxLen} characters`;
    }
    
    return null;
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  return async (ctx: Context, next: Next) => {
    // Only apply to newsletter subscription endpoints
    if (!ctx.request.url.includes('/newsletter-subscription')) {
      return await next();
    }

    // Only sanitize POST and PUT requests
    if (!['POST', 'PUT'].includes(ctx.request.method)) {
      return await next();
    }

    if (ctx.request.body) {
      const requestData = ctx.request.body?.data || ctx.request.body || {};
      
      // Sanitize all string fields
      const sanitizedData = sanitizeObject(requestData);
      
      // Validate field lengths
      const errors: Array<{ path: string[]; message: string; name: string }> = [];
      
      for (const [field, value] of Object.entries(sanitizedData)) {
        if (typeof value === 'string' && maxLength[field]) {
          const lengthError = validateLength(value, field, maxLength[field]);
          if (lengthError) {
            errors.push({
              path: [field],
              message: lengthError,
              name: 'ValidationError'
            });
          }
        }
      }
      
      // Return validation errors if any
      if (errors.length > 0) {
        ctx.status = 400;
        ctx.body = {
          error: {
            status: 400,
            name: 'ValidationError',
            message: 'Input validation failed',
            details: {
              errors
            }
          }
        };
        return;
      }
      
      // Apply sanitized data back to request
      if (ctx.request.body?.data) {
        ctx.request.body.data = sanitizedData;
      } else {
        ctx.request.body = sanitizedData;
      }
    }

    await next();
  };
};

export default inputSanitization;
export { SanitizationConfig };