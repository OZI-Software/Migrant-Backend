/**
 * Enhanced News Controller
 * Handles synchronous RSS processing with all 5 phases
 */

// Enhanced News Controller - Standalone controller for RSS processing

// Type definitions
interface CategoryStats {
  count: number;
  articles: Array<{
    id: number;
    title: string;
    createdAt: string;
    status: string;
  }>;
}

interface Article {
  id: number;
  title: string;
  category?: string;
  createdAt: string;
  publishedAt?: string;
}

export default ({ strapi }) => ({
  
  /**
   * Process all categories synchronously
   */
  async processSynchronous(ctx) {
    try {
      const { maxArticlesPerCategory = 5 } = ctx.request.body;

      strapi.log.info('🚀 Starting enhanced synchronous processing for all categories');

      // Import the enhanced sync pipeline
      const { EnhancedSyncPipeline } = await import('../../../services/enhanced-sync-pipeline');
      const pipeline = new EnhancedSyncPipeline(strapi);

      // Process all categories
      const results = await pipeline.processAllCategoriesSync(maxArticlesPerCategory);

      // Calculate summary statistics
      let totalProcessed = 0;
      let totalSuccessful = 0;
      const categoryStats = {};

      for (const [category, categoryResults] of results) {
        const successful = categoryResults.filter(r => r.success).length;
        const total = categoryResults.length;
        
        totalProcessed += total;
        totalSuccessful += successful;
        
        categoryStats[category] = {
          total,
          successful,
          failed: total - successful,
          successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
          articles: categoryResults.map(r => ({
            title: r.originalTitle,
            success: r.success,
            articleId: r.articleId,
            error: r.error,
            processingTime: r.processingTime
          }))
        };
      }

      ctx.body = {
        success: true,
        message: 'Enhanced synchronous processing completed',
        summary: {
          totalProcessed,
          totalSuccessful,
          totalFailed: totalProcessed - totalSuccessful,
          overallSuccessRate: totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 100) : 0
        },
        categories: categoryStats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      strapi.log.error('Enhanced synchronous processing failed:', error);
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Process a specific category synchronously
   */
  async processCategory(ctx) {
    try {
      const { category, maxArticles = 10 } = ctx.request.body;

      if (!category) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Category is required'
        };
        return;
      }

      const validCategories = ['technology', 'business', 'sports', 'entertainment', 'health', 'science'];
      if (!validCategories.includes(category.toLowerCase())) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: `Invalid category. Valid categories: ${validCategories.join(', ')}`
        };
        return;
      }

      strapi.log.info(`🚀 Starting enhanced synchronous processing for category: ${category}`);

      // Import the enhanced sync pipeline
      const { EnhancedSyncPipeline } = await import('../../../services/enhanced-sync-pipeline');
      const pipeline = new EnhancedSyncPipeline(strapi);

      // Process the specific category
      const results = await pipeline.processCategorySync(category.toLowerCase(), maxArticles);

      // Calculate statistics
      const successful = results.filter(r => r.success).length;
      const total = results.length;

      ctx.body = {
        success: true,
        message: `Enhanced synchronous processing completed for ${category}`,
        category: category.toLowerCase(),
        summary: {
          total,
          successful,
          failed: total - successful,
          successRate: total > 0 ? Math.round((successful / total) * 100) : 0
        },
        articles: results.map(r => ({
          title: r.originalTitle,
          success: r.success,
          articleId: r.articleId,
          error: r.error,
          processingTime: r.processingTime
        })),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      strapi.log.error('Enhanced category processing failed:', error);
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Get processing status and recent articles
   */
  async getStatus(ctx) {
    try {
      // Get recent articles created in the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentArticles = await strapi.entityService.findMany('api::article.article', {
        filters: {
          createdAt: {
            $gte: twentyFourHoursAgo.toISOString()
          }
        },
        sort: { createdAt: 'desc' },
        limit: 50,
        populate: ['category']
      }) as Article[];

      // Group by category
      const categoryStats: Record<string, CategoryStats> = {};
      const categories = ['technology', 'business', 'sports', 'entertainment', 'health', 'science'];
      
      categories.forEach(cat => {
        categoryStats[cat] = {
          count: 0,
          articles: []
        };
      });

      recentArticles.forEach(article => {
        const category = (article.category as any)?.toLowerCase() || 'uncategorized';
        if (categoryStats[category]) {
          categoryStats[category].count++;
          categoryStats[category].articles.push({
            id: article.id,
            title: article.title,
            createdAt: article.createdAt,
            status: article.publishedAt ? 'published' : 'draft'
          });
        }
      });

      ctx.body = {
        success: true,
        status: 'operational',
        summary: {
          totalRecentArticles: recentArticles.length,
          timeframe: '24 hours',
          categoriesActive: Object.values(categoryStats).filter(cat => cat.count > 0).length
        },
        categories: categoryStats,
        systemInfo: {
          geminiAIAvailable: !!process.env.GEMINI_API_KEY,
          supportedCategories: categories
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      strapi.log.error('Failed to get enhanced news status:', error);
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

});