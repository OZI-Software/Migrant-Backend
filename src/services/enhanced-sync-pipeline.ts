/**
 * Enhanced Sync Pipeline Service
 * Provides synchronous processing capabilities using the simplified GoogleNewsFeedService
 */

import GoogleNewsFeedService from './google-news-feed';

interface ProcessingResult {
  success: boolean;
  originalTitle: string;
  articleId?: number;
  error?: string;
  processingTime: number;
}

export class EnhancedSyncPipeline {
  private googleNewsFeedService: GoogleNewsFeedService;

  constructor(private strapi: any) {
    this.googleNewsFeedService = new GoogleNewsFeedService(strapi);
  }

  /**
   * Process all categories synchronously
   */
  async processAllCategoriesSync(maxArticlesPerCategory: number = 5): Promise<Map<string, ProcessingResult[]>> {
    const results = new Map<string, ProcessingResult[]>();
    
    // Get available categories from GoogleNewsFeedService
    const categories = ['Politics', 'Economy', 'World', 'Science', 'Culture', 'Sport', 'Security', 'Law', 'Society'];
    
    for (const category of categories) {
      try {
        this.strapi.log.info(`Processing category: ${category}`);
        const categoryResults = await this.processCategorySync(category, maxArticlesPerCategory);
        results.set(category, categoryResults);
      } catch (error) {
        this.strapi.log.error(`Error processing category ${category}:`, error);
        results.set(category, [{
          success: false,
          originalTitle: `Category ${category}`,
          error: error.message,
          processingTime: 0
        }]);
      }
    }
    
    return results;
  }

  /**
   * Process a specific category synchronously
   */
  async processCategorySync(category: string, maxArticles: number = 5): Promise<ProcessingResult[]> {
    const startTime = Date.now();
    const results: ProcessingResult[] = [];
    
    try {
      // Use the simplified GoogleNewsFeedService to import news
      const importResult = await this.googleNewsFeedService.importNews([category], maxArticles);
      
      // Convert the import result to ProcessingResult format
      // Create success results for imported articles
      for (let i = 0; i < importResult.imported; i++) {
        results.push({
          success: true,
          originalTitle: `Article ${i + 1} from ${category}`,
          articleId: Date.now() + i, // Simple ID generation
          processingTime: Date.now() - startTime
        });
      }
      
      // Create skipped results
      for (let i = 0; i < importResult.skipped; i++) {
        results.push({
          success: false,
          originalTitle: `Skipped Article ${i + 1} from ${category}`,
          error: 'Article skipped (duplicate or invalid)',
          processingTime: Date.now() - startTime
        });
      }
      
      // Create error results for failed articles
      for (let i = 0; i < importResult.errors; i++) {
        results.push({
          success: false,
          originalTitle: `Failed Article ${i + 1} from ${category}`,
          error: 'Processing failed',
          processingTime: Date.now() - startTime
        });
      }
    } catch (error) {
      this.strapi.log.error(`Error in processCategorySync for ${category}:`, error);
      results.push({
        success: false,
        originalTitle: `Category ${category}`,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime
      });
    }
    
    return results;
  }
}

export default EnhancedSyncPipeline;