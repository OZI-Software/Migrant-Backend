/**
 * newsletter controller
 */

import { factories } from '@strapi/strapi';

interface Subscriber {
  id: number;
  email: string;
  fullname?: string;
  isActive: boolean;
}

export default factories.createCoreController('api::newsletter.newsletter', ({ strapi }) => ({
  // Custom subscribe method
  async subscribe(ctx) {
    try {
      const { email, fullname } = ctx.request.body;

      // Validate required fields
      if (!email) {
        return ctx.badRequest('Email is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return ctx.badRequest('Invalid email format');
      }

      // Check if subscriber already exists
      const existingSubscriber = await strapi.entityService.findMany('api::subscriber.subscriber', {
        filters: { email },
        limit: 1,
      }) as any[];

      if (existingSubscriber.length > 0) {
        // If subscriber exists but is inactive, reactivate them
        if (!existingSubscriber[0].isActive) {
          const updatedSubscriber = await strapi.entityService.update('api::subscriber.subscriber', existingSubscriber[0].id, {
            data: {
              isActive: true,
              fullname: fullname || existingSubscriber[0].fullname,
              subscribedAt: new Date(),
            },
          });
          
          return ctx.send({
            message: 'Successfully reactivated your subscription!',
            data: {
              email: updatedSubscriber.email,
              isActive: updatedSubscriber.isActive,
            },
          });
        } else {
          return ctx.send({
            message: 'You are already subscribed to our newsletter!',
            data: {
              email: existingSubscriber[0].email,
              isActive: existingSubscriber[0].isActive,
            },
          });
        }
      }

      // Create new subscriber
      const newSubscriber = await strapi.entityService.create('api::subscriber.subscriber', {
        data: {
          email,
          fullname: fullname || 'Anonymous',
          isActive: true,
          subscribedAt: new Date(),
        },
      });

      return ctx.send({
        message: 'Successfully subscribed to newsletter!',
        data: {
          email: newSubscriber.email,
          isActive: newSubscriber.isActive,
        },
      });
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      return ctx.internalServerError('Failed to process subscription. Please try again later.');
    }
  },
}));
