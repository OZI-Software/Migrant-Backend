/**
 * Email Validation Middleware
 * Validates email format and prevents invalid email submissions
 */

import { Context, Next } from 'koa';

interface EmailValidationConfig {
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireVerification?: boolean;
}

const emailValidation = (config: EmailValidationConfig = {}) => {
  return async (ctx: Context, next: Next) => {
    // Only apply to newsletter subscription endpoints
    if (!ctx.request.url.includes('/newsletter-subscription')) {
      return await next();
    }

    // Only validate POST and PUT requests
    if (!['POST', 'PUT'].includes(ctx.request.method)) {
      return await next();
    }

    const { email } = ctx.request.body?.data || ctx.request.body || {};

    if (!email) {
      ctx.status = 400;
      ctx.body = {
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'Email is required',
          details: {
            errors: [{
              path: ['email'],
              message: 'Email field is required',
              name: 'ValidationError'
            }]
          }
        }
      };
      return;
    }

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      ctx.status = 400;
      ctx.body = {
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'Invalid email format',
          details: {
            errors: [{
              path: ['email'],
              message: 'Please provide a valid email address',
              name: 'ValidationError'
            }]
          }
        }
      };
      return;
    }

    // Check for disposable email domains
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'throwaway.email',
      'temp-mail.org',
      'yopmail.com'
    ];

    const emailDomain = email.split('@')[1].toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      ctx.status = 400;
      ctx.body = {
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'Disposable email addresses are not allowed',
          details: {
            errors: [{
              path: ['email'],
              message: 'Please use a permanent email address',
              name: 'ValidationError'
            }]
          }
        }
      };
      return;
    }

    // Check blocked domains if configured
    if (config.blockedDomains && config.blockedDomains.includes(emailDomain)) {
      ctx.status = 400;
      ctx.body = {
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'Email domain is not allowed',
          details: {
            errors: [{
              path: ['email'],
              message: 'This email domain is not permitted',
              name: 'ValidationError'
            }]
          }
        }
      };
      return;
    }

    // Check allowed domains if configured
    if (config.allowedDomains && !config.allowedDomains.includes(emailDomain)) {
      ctx.status = 400;
      ctx.body = {
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'Email domain is not allowed',
          details: {
            errors: [{
              path: ['email'],
              message: 'Only specific email domains are permitted',
              name: 'ValidationError'
            }]
          }
        }
      };
      return;
    }

    // Normalize email (lowercase)
    if (ctx.request.body?.data) {
      ctx.request.body.data.email = email.toLowerCase().trim();
    } else if (ctx.request.body) {
      ctx.request.body.email = email.toLowerCase().trim();
    }

    await next();
  };
};

export default emailValidation;
export { EmailValidationConfig };