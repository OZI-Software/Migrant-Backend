import type { Core } from '@strapi/strapi';
import NewsCronJobService from '../../../services/news-cron-job';
import GoogleNewsFeedService from '../../../services/google-news-feed';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Manually trigger news import
   */
  async manualImport(ctx) {
    try {
      const { categories = ['World'], maxArticlesPerCategory = 10 } = ctx.request.body || {};

      // Validate categories
      const validCategories = ['Politics', 'Economy', 'World', 'Security', 'Law', 'Science', 'Society', 'Culture', 'Sport'];
      const invalidCategories = categories.filter(cat => !validCategories.includes(cat));
      
      if (invalidCategories.length > 0) {
        return ctx.badRequest(`Invalid categories: ${invalidCategories.join(', ')}`);
      }

      // Validate maxArticlesPerCategory
      if (maxArticlesPerCategory < 1 || maxArticlesPerCategory > 50) {
        return ctx.badRequest('maxArticlesPerCategory must be between 1 and 50');
      }

      // Get GoogleNewsFeedService directly
      let googleNewsService;
      try {
        if ((strapi as any).container && typeof (strapi as any).container.get === 'function') {
          googleNewsService = (strapi as any).container.get('googleNewsFeedService');
        }
      } catch (error) {
        strapi.log.warn('Failed to get GoogleNewsFeedService from container:', error);
      }
      
      // Fallback to global variable
      if (!googleNewsService && (global as any).googleNewsFeedService) {
        googleNewsService = (global as any).googleNewsFeedService;
      }
      
      // Last resort: create new instance
      if (!googleNewsService) {
        strapi.log.warn('Creating new GoogleNewsFeedService instance as fallback');
        googleNewsService = new GoogleNewsFeedService(strapi);
      }

      strapi.log.info(`Manual news import triggered by user. Categories: ${categories.join(', ')}`);
      
      const result = await googleNewsService.importNews(categories, maxArticlesPerCategory);
      
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
      // Get NewsCronJobService with fallback mechanism
      let newsCronJobService;
      try {
        if ((strapi as any).container && typeof (strapi as any).container.get === 'function') {
          newsCronJobService = (strapi as any).container.get('newsCronJobService');
        }
      } catch (error) {
        strapi.log.warn('Failed to get NewsCronJobService from container:', error);
      }
      
      // Fallback to global variable
      if (!newsCronJobService && (global as any).newsCronJobService) {
        newsCronJobService = (global as any).newsCronJobService;
      }
      
      // Last resort: create new instance
      if (!newsCronJobService) {
        strapi.log.warn('Creating new NewsCronJobService instance as fallback');
        newsCronJobService = new NewsCronJobService();
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
      // Get NewsCronJobService with fallback mechanism
      let newsCronJobService;
      try {
        if ((strapi as any).container && typeof (strapi as any).container.get === 'function') {
          newsCronJobService = (strapi as any).container.get('newsCronJobService');
        }
      } catch (error) {
        strapi.log.warn('Failed to get NewsCronJobService from container:', error);
      }
      
      // Fallback to global variable
      if (!newsCronJobService && (global as any).newsCronJobService) {
        newsCronJobService = (global as any).newsCronJobService;
      }
      
      // Last resort: create new instance
      if (!newsCronJobService) {
        strapi.log.warn('Creating new NewsCronJobService instance as fallback');
        newsCronJobService = new NewsCronJobService();
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
      // Get NewsCronJobService with fallback mechanism
      let newsCronJobService;
      try {
        if ((strapi as any).container && typeof (strapi as any).container.get === 'function') {
          newsCronJobService = (strapi as any).container.get('newsCronJobService');
        }
      } catch (error) {
        strapi.log.warn('Failed to get NewsCronJobService from container:', error);
      }
      
      // Fallback to global variable
      if (!newsCronJobService && (global as any).newsCronJobService) {
        newsCronJobService = (global as any).newsCronJobService;
      }
      
      // Last resort: create new instance
      if (!newsCronJobService) {
        strapi.log.warn('Creating new NewsCronJobService instance as fallback');
        newsCronJobService = new NewsCronJobService();
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

  /**
   * Test AI extraction with provided content
   */
  async testAiExtraction(ctx) {
    try {
      const { url, title, description, content } = ctx.request.body || {};

      // Validate required fields
      if (!url || !title || !content) {
        return ctx.badRequest('Missing required fields: url, title, and content are required');
      }

      strapi.log.info(`🧪 Testing AI extraction for: ${title.substring(0, 100)}...`);

      // Get GoogleNewsFeedService with fallback mechanism
      let googleNewsService;
      try {
        if ((strapi as any).container && typeof (strapi as any).container.get === 'function') {
          googleNewsService = (strapi as any).container.get('googleNewsFeedService');
        }
      } catch (error) {
        strapi.log.warn('Failed to get GoogleNewsFeedService from container:', error);
      }
      
      // Fallback to global variable
      if (!googleNewsService && (global as any).googleNewsFeedService) {
        googleNewsService = (global as any).googleNewsFeedService;
      }
      
      // Last resort: create new instance
      if (!googleNewsService) {
        strapi.log.warn('Creating new GoogleNewsFeedService instance as fallback');
        googleNewsService = new GoogleNewsFeedService(strapi);
      }

      // Create a mock article object for AI processing
      const mockArticle = {
        title,
        description,
        link: url,
        pubDate: new Date().toISOString(),
        content: content,
        category: 'Test'
      };

      const startTime = Date.now();

      // Test AI extraction directly
      const aiResult = await googleNewsService.testAIExtraction(mockArticle);
      
      const processingTime = Date.now() - startTime;

      strapi.log.info(`✅ AI extraction test completed in ${processingTime}ms`);

      ctx.body = {
        success: true,
        message: 'AI extraction test completed successfully',
        data: {
          ...aiResult,
          processingTime: `${processingTime}ms`,
          originalContent: {
            title,
            description,
            url,
            contentLength: content.length
          }
        }
      };
    } catch (error) {
      strapi.log.error('AI extraction test failed:', error);
      ctx.internalServerError('AI extraction test failed', { 
        error: error.message,
        stack: error.stack 
      });
    }
  },
});