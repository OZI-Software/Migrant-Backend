import type { Core } from '@strapi/strapi';
import NewsCronJobService from '../../../services/news-cron-job';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Manually trigger news import
   */
  async manualImport(ctx) {
    try {
      const { categories = ['topStories'], maxArticlesPerCategory = 10 } = ctx.request.body || {};

      // Validate categories
      const validCategories = ['topStories', 'world', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'];
      const invalidCategories = categories.filter(cat => !validCategories.includes(cat));
      
      if (invalidCategories.length > 0) {
        return ctx.badRequest(`Invalid categories: ${invalidCategories.join(', ')}`);
      }

      // Validate maxArticlesPerCategory
      if (maxArticlesPerCategory < 1 || maxArticlesPerCategory > 50) {
        return ctx.badRequest('maxArticlesPerCategory must be between 1 and 50');
      }

      const newsCronJobService = (strapi as any).container.get('newsCronJobService');
      
      if (!newsCronJobService) {
        strapi.log.error('NewsCronJobService not found in container');
        return ctx.internalServerError('News service not available');
      }
      
      if (newsCronJobService.isJobRunning()) {
        return ctx.conflict('A news import job is already running. Please wait for it to complete.');
      }

      strapi.log.info(`Manual news import triggered by user. Categories: ${categories.join(', ')}`);
      
      const result = await newsCronJobService.triggerManualImport(categories, maxArticlesPerCategory);
      
      ctx.body = {
        success: true,
        message: 'Manual news import completed successfully',
        data: result
      };
    } catch (error) {
      strapi.log.error('Manual news import failed:', error);
      ctx.internalServerError('Failed to import news', { error: error.message });
    }
  },

  /**
   * Get status of all cron jobs
   */
  async getStatus(ctx) {
    try {
      const newsCronJobService = (strapi as any).container.get('newsCronJobService');
      
      if (!newsCronJobService) {
        strapi.log.error('NewsCronJobService not found in container');
        return ctx.internalServerError('News service not available');
      }
      
      const status = newsCronJobService.getJobsStatus();
      const isRunning = newsCronJobService.isJobRunning();
      
      ctx.body = {
        success: true,
        data: {
          jobs: status,
          currentlyRunning: isRunning,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      strapi.log.error('Failed to get news feed status:', error);
      ctx.internalServerError('Failed to get status', { error: error.message });
    }
  },

  /**
   * Start all cron jobs
   */
  async startJobs(ctx) {
    try {
      const newsCronJobService = (strapi as any).container.get('newsCronJobService');
      
      if (!newsCronJobService) {
        strapi.log.error('NewsCronJobService not found in container');
        return ctx.internalServerError('News service not available');
      }
      
      newsCronJobService.startAllJobs();
      
      strapi.log.info('News cron jobs started manually');
      
      ctx.body = {
        success: true,
        message: 'All news cron jobs have been started'
      };
    } catch (error) {
      strapi.log.error('Failed to start news cron jobs:', error);
      ctx.internalServerError('Failed to start jobs', { error: error.message });
    }
  },

  /**
   * Stop all cron jobs
   */
  async stopJobs(ctx) {
    try {
      const newsCronJobService = (strapi as any).container.get('newsCronJobService');
      
      if (!newsCronJobService) {
        strapi.log.error('NewsCronJobService not found in container');
        return ctx.internalServerError('News service not available');
      }
      
      newsCronJobService.stopAllJobs();
      
      strapi.log.info('News cron jobs stopped manually');
      
      ctx.body = {
        success: true,
        message: 'All news cron jobs have been stopped'
      };
    } catch (error) {
      strapi.log.error('Failed to stop news cron jobs:', error);
      ctx.internalServerError('Failed to stop jobs', { error: error.message });
    }
  },
});