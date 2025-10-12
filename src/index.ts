import NewsCronJobService from './services/news-cron-job';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {
    // Initialize and start news cron jobs
    try {
      const newsCronJobService = new NewsCronJobService();
      
      // Store the service instance globally for access from controllers
      (global as any).newsCronJobService = newsCronJobService;
      
      // Start all cron jobs
      newsCronJobService.startAllJobs();
      
      strapi.log.info('🚀 News cron jobs initialized and started successfully');
      strapi.log.info('📅 Jobs will run every 2 hours for all categories: Politics, Economy, World, Security, Law, Science, Society, Culture, Sport');
      
    } catch (error) {
      strapi.log.error('❌ Failed to initialize news cron jobs:', error);
    }
  },
};