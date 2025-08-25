/**
 * Newsletter Security Middlewares
 * Collection of security and validation middlewares for newsletter subscription
 */

import emailValidation, { EmailValidationConfig } from './email-validation';
import rateLimiting, { RateLimitConfig } from './rate-limiting';
import subscriptionValidation, { SubscriptionValidationConfig } from './subscription-validation';
import inputSanitization, { SanitizationConfig } from './input-sanitization';
import requestLogging, { LoggingConfig } from './request-logging';

// Default configurations
const defaultConfigs = {
  emailValidation: {
    // Block common disposable email domains
    // Add more domains as needed
  } as EmailValidationConfig,
  
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 subscription attempts per 15 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: true // Don't count failed requests against limit
  } as RateLimitConfig,
  
  subscriptionValidation: {
    allowDuplicates: false,
    requireFullName: true,
    minNameLength: 2,
    maxNameLength: 100
  } as SubscriptionValidationConfig,
  
  inputSanitization: {
    maxLength: {
      email: 254, // RFC 5321 limit
      fullname: 100
    }
  } as SanitizationConfig,
  
  requestLogging: {
    logLevel: 'info' as const,
    logSuccessfulRequests: true,
    logFailedRequests: true,
    logRequestBody: false, // Set to true for debugging
    logResponseBody: false, // Set to true for debugging
    sensitiveFields: ['password', 'token', 'apiKey', 'secret', 'key'],
    maxBodyLength: 1000
  } as LoggingConfig
};

// Create configured middleware instances
const createNewsletterSecurityMiddlewares = (customConfigs: {
  emailValidation?: Partial<EmailValidationConfig>;
  rateLimiting?: Partial<RateLimitConfig>;
  subscriptionValidation?: Partial<SubscriptionValidationConfig>;
  inputSanitization?: Partial<SanitizationConfig>;
  requestLogging?: Partial<LoggingConfig>;
} = {}) => {
  return {
    emailValidation: emailValidation({
      ...defaultConfigs.emailValidation,
      ...customConfigs.emailValidation
    }),
    
    rateLimiting: rateLimiting({
      ...defaultConfigs.rateLimiting,
      ...customConfigs.rateLimiting
    }),
    
    subscriptionValidation: subscriptionValidation({
      ...defaultConfigs.subscriptionValidation,
      ...customConfigs.subscriptionValidation
    }),
    
    inputSanitization: inputSanitization({
      ...defaultConfigs.inputSanitization,
      ...customConfigs.inputSanitization
    }),
    
    requestLogging: requestLogging({
      ...defaultConfigs.requestLogging,
      ...customConfigs.requestLogging
    })
  };
};

// Export individual middlewares
export {
  emailValidation,
  rateLimiting,
  subscriptionValidation,
  inputSanitization,
  requestLogging,
  createNewsletterSecurityMiddlewares,
  defaultConfigs
};

// Export types
export type {
  EmailValidationConfig,
  RateLimitConfig,
  SubscriptionValidationConfig,
  SanitizationConfig,
  LoggingConfig
};

// Default export with all middlewares configured
export default createNewsletterSecurityMiddlewares();