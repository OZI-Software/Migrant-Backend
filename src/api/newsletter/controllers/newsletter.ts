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
      
      // Log the subscription attempt for debugging
      console.log('Newsletter subscription attempt:', { email, fullname: fullname || 'Anonymous' });

      // Validate required fields
      if (!email) {
        console.log('Newsletter subscription failed: Email is required');
        return ctx.badRequest('Email is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('Newsletter subscription failed: Invalid email format', email);
        return ctx.badRequest('Invalid email format');
      }

      // Check if subscriber already exists
      console.log('Checking for existing subscriber:', email);
      const existingSubscriber = await strapi.entityService.findMany('api::subscriber.subscriber', {
        filters: { email },
        limit: 1,
      }) as any[];

      if (existingSubscriber.length > 0) {
        console.log('Existing subscriber found:', { 
          id: existingSubscriber[0].id, 
          email: existingSubscriber[0].email, 
          isActive: existingSubscriber[0].isActive 
        });
        
        // If subscriber exists but is inactive, reactivate them
        if (!existingSubscriber[0].isActive) {
          console.log('Reactivating inactive subscriber:', existingSubscriber[0].id);
          const updatedSubscriber = await strapi.entityService.update('api::subscriber.subscriber', existingSubscriber[0].id, {
            data: {
              isActive: true,
              fullname: fullname || existingSubscriber[0].fullname,
              subscribedAt: new Date(),
              publishedAt: new Date(), // Ensure it's published
            },
          });
          
          console.log('Subscriber reactivated successfully:', updatedSubscriber.id);
          return ctx.send({
            message: 'Successfully reactivated your subscription!',
            data: {
              email: updatedSubscriber.email,
              isActive: updatedSubscriber.isActive,
            },
          });
        } else {
          console.log('Subscriber already active:', existingSubscriber[0].id);
          return ctx.send({
            message: 'You are already subscribed to our newsletter!',
            data: {
              email: existingSubscriber[0].email,
              isActive: existingSubscriber[0].isActive,
            },
          });
        }
      }

      // Create new subscriber with published status
      console.log('Creating new subscriber for:', email);
      const newSubscriber = await strapi.entityService.create('api::subscriber.subscriber', {
        data: {
          email,
          fullname: fullname || 'Anonymous',
          isActive: true,
          subscribedAt: new Date(),
          publishedAt: new Date(), // Publish immediately
        },
      });

      console.log('New subscriber created successfully:', { 
        id: newSubscriber.id, 
        email: newSubscriber.email, 
        isActive: newSubscriber.isActive,
        publishedAt: newSubscriber.publishedAt 
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
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return ctx.internalServerError('An error occurred while processing your subscription');
    }
  },
  
  // Update newsletter status and sentAt safely via entityService
  async updateStatus(ctx) {
    try {
      const { id } = ctx.params as { id: string };
      const { status } = ctx.request.body as { status: 'draft' | 'sent' };

      if (!id) {
        return ctx.badRequest('Missing newsletter id');
      }
      if (!status || (status !== 'draft' && status !== 'sent')) {
        return ctx.badRequest('Invalid status');
      }

      // Ensure entity exists
      const existing = await strapi.entityService.findOne('api::newsletter.newsletter', Number(id), {
        fields: ['id', 'docStatus', 'sentAt']
      });
      if (!existing) {
        return ctx.notFound('Newsletter not found');
      }

      const updated = await strapi.entityService.update('api::newsletter.newsletter', Number(id), {
        data: {
          docStatus: status,
          sentAt: status === 'sent' ? new Date() : null,
        }
      });

      return ctx.send({
        message: 'Status updated',
        data: {
          id: updated.id,
          docStatus: updated.docStatus,
          sentAt: updated.sentAt,
        }
      });
    } catch (error) {
      console.error('Update newsletter status error:', error);
      return ctx.internalServerError('Failed to update status');
    }
  },
}));
