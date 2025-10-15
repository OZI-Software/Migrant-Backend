import type { Core } from '@strapi/strapi';
import NewsCronJobService from '../../../services/news-cron-job';
import GoogleNewsFeedService from '../../../services/google-news-feed';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const newsCronJobService = new NewsCronJobService();
  const googleNewsFeedService = new GoogleNewsFeedService();

  return {
    /**
     * Manually trigger news import
     */
    async manualImport(ctx) {
      try {
        const { categories, maxArticlesPerCategory } = ctx.request.body || {};
        
        strapi.log.info('Manual news import triggered via API');
        
        const result = await newsCronJobService.triggerManualImport(
          categories || ['World', 'Politics', 'Economy', 'Science'],
          maxArticlesPerCategory || 10
        );

        ctx.body = {
          success: true,
          message: 'Manual import completed successfully',
          data: result
        };
      } catch (error) {
        strapi.log.error('Manual import failed:', error);
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: error.message || 'Manual import failed',
          error: error.message
        };
      }
    },

    /**
     * Get status of all cron jobs
     */
    async getStatus(ctx) {
      try {
        const status = newsCronJobService.getJobsStatus();
        const isRunning = newsCronJobService.isJobRunning();

        ctx.body = {
          success: true,
          data: {
            jobs: status,
            currentlyRunning: isRunning
          }
        };
      } catch (error) {
        strapi.log.error('Failed to get status:', error);
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'Failed to get status',
          error: error.message
        };
      }
    },

    /**
     * Start all cron jobs
     */
    async startJobs(ctx) {
      try {
        newsCronJobService.startAllJobs();
        
        ctx.body = {
          success: true,
          message: 'All cron jobs started successfully'
        };
      } catch (error) {
        strapi.log.error('Failed to start jobs:', error);
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'Failed to start jobs',
          error: error.message
        };
      }
    },

    /**
     * Stop all cron jobs
     */
    async stopJobs(ctx) {
      try {
        newsCronJobService.stopAllJobs();
        
        ctx.body = {
          success: true,
          message: 'All cron jobs stopped successfully'
        };
      } catch (error) {
        strapi.log.error('Failed to stop jobs:', error);
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'Failed to stop jobs',
          error: error.message
        };
      }
    },

    /**
     * Test AI extraction functionality
     */
    async testAiExtraction(ctx) {
      try {
        const { url } = ctx.request.body || {};
        
        if (!url) {
          ctx.status = 400;
          ctx.body = {
            success: false,
            message: 'URL is required for testing AI extraction'
          };
          return;
        }

        strapi.log.info(`Testing AI extraction for URL: ${url}`);
        
        // Test the AI extraction directly
        const result = await googleNewsFeedService.testAIExtraction({ link: url, title: 'Test Article' });

        ctx.body = {
          success: true,
          message: 'AI extraction test completed',
          data: result
        };
      } catch (error) {
        strapi.log.error('AI extraction test failed:', error);
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'AI extraction test failed',
          error: error.message
        };
      }
    },

    /**
     * Get available categories
     */
    async getCategories(ctx) {
      try {
        const categories = ['Politics', 'Economy', 'World', 'Security', 'Law', 'Science', 'Society', 'Culture', 'Sport'];
        
        ctx.body = {
          success: true,
          data: categories
        };
      } catch (error) {
        strapi.log.error('Failed to get categories:', error);
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'Failed to get categories',
          error: error.message
        };
      }
    },

    /**
     * RSS-based import functionality
     */
    async rssBasedImport(ctx) {
      try {
        const { rssUrl, categories, maxArticles } = ctx.request.body || {};
        
        if (!rssUrl) {
          ctx.status = 400;
          ctx.body = {
            success: false,
            message: 'RSS URL is required'
          };
          return;
        }

        strapi.log.info(`RSS-based import triggered for URL: ${rssUrl}`);
        
        // Use the Google News Feed Service to import news
        const result = await googleNewsFeedService.importNews(
          categories || ['World'],
          maxArticles || 10
        );

        ctx.body = {
          success: true,
          message: 'RSS-based import completed successfully',
          data: result
        };
      } catch (error) {
        strapi.log.error('RSS-based import failed:', error);
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: error.message || 'RSS-based import failed',
          error: error.message
        };
      }
    }
  };
};