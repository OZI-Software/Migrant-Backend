import type { Core } from '@strapi/strapi';
import NewsCronJobService from './services/news-cron-job';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // Register the news cron job service globally
    try {
      if ((strapi as any).container && typeof (strapi as any).container.register === 'function') {
        (strapi as any).container.register('newsCronJobService', () => new NewsCronJobService());
      } else {
        // Fallback: store the service in a global variable if container is not available
        (global as any).newsCronJobService = new NewsCronJobService();
      }
    } catch (error) {
      console.error('Failed to register NewsCronJobService:', error);
      // Fallback: store the service in a global variable
      (global as any).newsCronJobService = new NewsCronJobService();
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      // Get the news cron job service
      let newsCronJobService;
      
      try {
        if ((strapi as any).container && typeof (strapi as any).container.get === 'function') {
          newsCronJobService = (strapi as any).container.get('newsCronJobService');
        }
      } catch (error) {
        console.warn('Failed to get service from container:', error);
      }
      
      // Fallback to global variable if container method failed
      if (!newsCronJobService) {
        newsCronJobService = (global as any).newsCronJobService;
      }
      
      if (!newsCronJobService) {
        strapi.log.error('NewsCronJobService not found in container or global scope during bootstrap');
        return;
      }
      
      // Start all cron jobs
      newsCronJobService.startAllJobs();
      
      strapi.log.info('News feed cron jobs have been started successfully');
      
      // Optional: Run an initial import on startup (uncomment if desired)
      // strapi.log.info('Running initial news import...');
      // await newsCronJobService.triggerManualImport(['topStories'], 5);
      // strapi.log.info('Initial news import completed');
      
    } catch (error) {
      strapi.log.error('Failed to start news cron jobs:', error);
    }

    // Graceful shutdown handling
    process.on('SIGINT', () => {
      strapi.log.info('Received SIGINT, stopping news cron jobs...');
      let newsCronJobService;
      
      try {
        if ((strapi as any).container && typeof (strapi as any).container.get === 'function') {
          newsCronJobService = (strapi as any).container.get('newsCronJobService');
        }
      } catch (error) {
        // Ignore error and try fallback
      }
      
      if (!newsCronJobService) {
        newsCronJobService = (global as any).newsCronJobService;
      }
      
      if (newsCronJobService) {
        newsCronJobService.stopAllJobs();
      }
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      strapi.log.info('Received SIGTERM, stopping news cron jobs...');
      let newsCronJobService;
      
      try {
        if ((strapi as any).container && typeof (strapi as any).container.get === 'function') {
          newsCronJobService = (strapi as any).container.get('newsCronJobService');
        }
      } catch (error) {
        // Ignore error and try fallback
      }
      
      if (!newsCronJobService) {
        newsCronJobService = (global as any).newsCronJobService;
      }
      
      if (newsCronJobService) {
        newsCronJobService.stopAllJobs();
      }
      process.exit(0);
    });
  },
};
