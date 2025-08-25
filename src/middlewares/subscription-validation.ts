/**
 * Subscription Validation Middleware
 * Prevents duplicate subscriptions and validates subscription data
 */

import { Context, Next } from 'koa';

interface Subscriber {
  id: number;
  email: string;
  fullname: string;
  isActive: boolean;
  subscribedAt: string;
}

interface SubscriptionValidationConfig {
  allowDuplicates?: boolean;
  requireFullName?: boolean;
  minNameLength?: number;
  maxNameLength?: number;
}

const subscriptionValidation = (config: SubscriptionValidationConfig = {}) => {
  const {
    allowDuplicates = false,
    requireFullName = true,
    minNameLength = 2,
    maxNameLength = 100
  } = config;

  return async (ctx: Context, next: Next) => {
    // Only apply to newsletter subscription endpoints
    if (!ctx.request.url.includes('/newsletter-subscription')) {
      return await next();
    }

    // Only validate POST requests (new subscriptions)
    if (ctx.request.method !== 'POST') {
      return await next();
    }

    const requestData = ctx.request.body?.data || ctx.request.body || {};
    const { email, fullname } = requestData;

    // Validate fullname if required
    if (requireFullName) {
      if (!fullname || typeof fullname !== 'string') {
        ctx.status = 400;
        ctx.body = {
          error: {
            status: 400,
            name: 'ValidationError',
            message: 'Full name is required',
            details: {
              errors: [{
                path: ['fullname'],
                message: 'Full name field is required',
                name: 'ValidationError'
              }]
            }
          }
        };
        return;
      }

      const trimmedName = fullname.trim();
      
      // Check name length
      if (trimmedName.length < minNameLength) {
        ctx.status = 400;
        ctx.body = {
          error: {
            status: 400,
            name: 'ValidationError',
            message: `Full name must be at least ${minNameLength} characters long`,
            details: {
              errors: [{
                path: ['fullname'],
                message: `Name must be at least ${minNameLength} characters`,
                name: 'ValidationError'
              }]
            }
          }
        };
        return;
      }

      if (trimmedName.length > maxNameLength) {
        ctx.status = 400;
        ctx.body = {
          error: {
            status: 400,
            name: 'ValidationError',
            message: `Full name must not exceed ${maxNameLength} characters`,
            details: {
              errors: [{
                path: ['fullname'],
                message: `Name must not exceed ${maxNameLength} characters`,
                name: 'ValidationError'
              }]
            }
          }
        };
        return;
      }

      // Validate name format (only letters, spaces, hyphens, apostrophes)
      const nameRegex = /^[a-zA-Z\s\-']+$/;
      if (!nameRegex.test(trimmedName)) {
        ctx.status = 400;
        ctx.body = {
          error: {
            status: 400,
            name: 'ValidationError',
            message: 'Full name contains invalid characters',
            details: {
              errors: [{
                path: ['fullname'],
                message: 'Name can only contain letters, spaces, hyphens, and apostrophes',
                name: 'ValidationError'
              }]
            }
          }
        };
        return;
      }

      // Normalize fullname
      if (ctx.request.body?.data) {
        ctx.request.body.data.fullname = trimmedName;
      } else if (ctx.request.body) {
        ctx.request.body.fullname = trimmedName;
      }
    }

    // Check for duplicate subscriptions if not allowed
    if (!allowDuplicates && email) {
      try {
        const existingSubscription = await strapi.entityService.findMany(
          'api::subscriber.subscriber',
          {
            filters: {
              email: email.toLowerCase().trim()
            },
            limit: 1
          }
        );

        if (existingSubscription && existingSubscription.length > 0) {
          const subscription = existingSubscription[0] as Subscriber;
          
          // If subscription exists and is active
          if (subscription.isActive) {
            ctx.status = 409;
            ctx.body = {
              error: {
                status: 409,
                name: 'ConflictError',
                message: 'Email is already subscribed to the newsletter',
                details: {
                  email: email.toLowerCase().trim(),
                  subscribedAt: subscription.subscribedAt,
                  message: 'This email address is already subscribed to our newsletter'
                }
              }
            };
            return;
          }
          
          // If subscription exists but is inactive, reactivate it
          if (!subscription.isActive) {
            try {
              const updatedSubscription = await strapi.entityService.update(
                'api::subscriber.subscriber',
                subscription.id,
                {
                  data: {
                    isActive: true,
                    subscribedAt: new Date(),
                    fullname: requestData.fullname || subscription.fullname
                  }
                }
              );

              ctx.status = 200;
              ctx.body = {
                data: updatedSubscription,
                meta: {
                  message: 'Subscription reactivated successfully'
                }
              };
              return;
            } catch (error) {
              console.error('Error reactivating subscription:', error);
              // Continue with normal flow if reactivation fails
            }
          }
        }
      } catch (error) {
        console.error('Error checking for duplicate subscription:', error);
        // Continue with normal flow if check fails
      }
    }

    // Set subscription timestamp
    const subscriptionData = {
      ...requestData,
      subscribedAt: new Date(),
      isActive: true
    };

    if (ctx.request.body?.data) {
      ctx.request.body.data = subscriptionData;
    } else {
      ctx.request.body = { data: subscriptionData };
    }

    await next();
  };
};

export default subscriptionValidation;
export { SubscriptionValidationConfig };