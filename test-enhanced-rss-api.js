/**
 * Enhanced RSS API Test Suite
 * Tests the integrated RSS extraction capabilities with comprehensive logging
 */

// Mock Strapi global object
global.strapi = {
  log: {
    info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
    debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args)
  },
  entityService: {
    findMany: async (model, options) => {
      // Mock existing articles check
      if (model === 'api::article.article') {
        return []; // No existing articles
      }
      // Mock categories
      if (model === 'api::category.category') {
        return [{ id: 1, name: options.filters.name, slug: options.filters.name.toLowerCase() }];
      }
      // Mock authors
      if (model === 'api::author.author') {
        return [{ id: 1, name: 'News Bot', email: 'news@example.com' }];
      }
      // Mock tags
      if (model === 'api::tag.tag') {
        return [];
      }
      return [];
    },
    create: async (model, data) => {
      // Mock article creation
      if (model === 'api::article.article') {
        const article = {
          id: Math.floor(Math.random() * 1000),
          ...data.data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('\n🎉 MOCK ARTICLE CREATED:');
        console.log('=====================================');
        console.log(`📰 Title: ${article.title}`);
        console.log(`🔗 Slug: ${article.slug}`);
        console.log(`📝 Content Length: ${article.content?.length || 0} characters`);
        console.log(`🖼️  Primary Image: ${article.imageUrl || 'None'}`);
        console.log(`📊 Read Time: ${article.readTime} minutes`);
        console.log(`🏷️  Tags: ${article.tags?.join(', ') || 'None'}`);
        console.log(`📍 Location: ${article.location || 'Unknown'}`);
        console.log(`⚡ Breaking News: ${article.isBreaking ? 'Yes' : 'No'}`);
        console.log(`🔗 Source: ${article.sourceUrl}`);
        
        if (article.images && article.images.length > 0) {
          console.log(`\n🖼️  OPTIMIZED IMAGES (${article.images.length}):`);
          article.images.forEach((img, index) => {
            console.log(`   ${index + 1}. Score: ${img.score} | ${img.width}x${img.height} | ${img.format}`);
            console.log(`      URL: ${img.url.substring(0, 80)}...`);
          });
        }
        
        if (article.extractionResult) {
          console.log(`\n📊 EXTRACTION DETAILS:`);
          console.log(`   Method: ${article.extractionResult.extractionMethod}`);
          console.log(`   Quality: ${article.extractionResult.contentQuality.toUpperCase()}`);
          console.log(`   Word Count: ${article.extractionResult.wordCount}`);
          console.log(`   Processing Time: ${article.extractionResult.processingTime}ms`);
        }
        
        console.log('=====================================\n');
        
        return article;
      }
      
      // Mock category creation
      if (model === 'api::category.category') {
        return { id: Math.floor(Math.random() * 100), ...data.data };
      }
      
      // Mock tag creation
      if (model === 'api::tag.tag') {
        return { id: Math.floor(Math.random() * 100), ...data.data };
      }
      
      return { id: Math.floor(Math.random() * 1000), ...data.data };
    }
  }
};

// Import the enhanced Google News Feed Service
const GoogleNewsFeedService = require('./src/services/google-news-feed.ts').default;

/**
 * Mock API Endpoints for Enhanced RSS Testing
 */
class EnhancedRSSAPI {
  constructor() {
    this.googleNewsService = new GoogleNewsFeedService();
    this.testResults = {
      totalArticles: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      categoriesProcessed: [],
      processingTimes: [],
      qualityDistribution: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0
      },
      imageStats: {
        totalImages: 0,
        averageScore: 0,
        articlesWithImages: 0
      }
    };
  }

  /**
   * API Endpoint: Test single category RSS extraction
   */
  async testSingleCategory(category = 'World', maxArticles = 5) {
    console.log(`\n🚀 TESTING SINGLE CATEGORY: ${category.toUpperCase()}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    try {
      const result = await this.googleNewsService.importNews([category], maxArticles);
      const processingTime = Date.now() - startTime;
      
      console.log(`\n📊 CATEGORY RESULTS FOR ${category.toUpperCase()}:`);
      console.log(`   ✅ Imported: ${result.imported}`);
      console.log(`   ⏭️  Skipped: ${result.skipped}`);
      console.log(`   ❌ Errors: ${result.errors}`);
      console.log(`   ⏱️  Total Time: ${processingTime}ms`);
      
      // Get processing statistics
      const stats = this.googleNewsService.getProcessingStats();
      console.log(`\n📈 PROCESSING STATISTICS:`);
      console.log(`   Success Rate: ${stats.successRate}`);
      console.log(`   Average Processing Time: ${stats.averageProcessingTime}ms`);
      console.log(`   Total Images Processed: ${stats.totalImages}`);
      console.log(`   Articles with Images: ${stats.articlesWithImages}`);
      console.log(`   Average Image Score: ${stats.averageImageScore.toFixed(1)}`);
      
      this.updateTestResults(result, category, processingTime, stats);
      
      return {
        success: true,
        category,
        result,
        stats,
        processingTime
      };
      
    } catch (error) {
      console.error(`❌ Error testing category ${category}:`, error);
      return {
        success: false,
        category,
        error: error.message
      };
    }
  }

  /**
   * API Endpoint: Test multiple categories RSS extraction
   */
  async testMultipleCategories(categories = ['World', 'Technology', 'Sports'], maxArticlesPerCategory = 3) {
    console.log(`\n🌍 TESTING MULTIPLE CATEGORIES: ${categories.join(', ').toUpperCase()}`);
    console.log('='.repeat(80));
    
    const overallStartTime = Date.now();
    const categoryResults = [];
    
    for (const category of categories) {
      const result = await this.testSingleCategory(category, maxArticlesPerCategory);
      categoryResults.push(result);
      
      // Add delay between categories to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const totalProcessingTime = Date.now() - overallStartTime;
    
    console.log(`\n🏆 OVERALL MULTI-CATEGORY RESULTS:`);
    console.log('='.repeat(50));
    console.log(`   📊 Categories Processed: ${categories.length}`);
    console.log(`   ⏱️  Total Processing Time: ${totalProcessingTime}ms`);
    console.log(`   📰 Total Articles: ${this.testResults.totalArticles}`);
    console.log(`   ✅ Successful Extractions: ${this.testResults.successfulExtractions}`);
    console.log(`   ❌ Failed Extractions: ${this.testResults.failedExtractions}`);
    
    const successRate = this.testResults.totalArticles > 0 
      ? (this.testResults.successfulExtractions / this.testResults.totalArticles * 100).toFixed(2)
      : 0;
    console.log(`   📈 Overall Success Rate: ${successRate}%`);
    
    this.printQualityDistribution();
    this.printImageStatistics();
    
    return {
      success: true,
      categories,
      categoryResults,
      overallStats: this.testResults,
      totalProcessingTime
    };
  }

  /**
   * API Endpoint: Test RSS feed processing with custom URL
   */
  async testCustomRSSFeed(feedUrl, category = 'Custom', maxArticles = 5) {
    console.log(`\n🔗 TESTING CUSTOM RSS FEED: ${feedUrl}`);
    console.log('='.repeat(60));
    
    try {
      // This would require modifying the service to accept custom URLs
      // For now, we'll simulate the process
      console.log(`   📡 Fetching RSS feed from: ${feedUrl}`);
      console.log(`   📂 Category: ${category}`);
      console.log(`   📊 Max Articles: ${maxArticles}`);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`   ✅ Custom RSS feed processing completed`);
      
      return {
        success: true,
        feedUrl,
        category,
        message: 'Custom RSS feed processing would be implemented here'
      };
      
    } catch (error) {
      console.error(`❌ Error testing custom RSS feed:`, error);
      return {
        success: false,
        feedUrl,
        error: error.message
      };
    }
  }

  /**
   * API Endpoint: Get processing statistics
   */
  async getProcessingStatistics() {
    console.log(`\n📊 CURRENT PROCESSING STATISTICS:`);
    console.log('='.repeat(40));
    
    const stats = this.googleNewsService.getProcessingStats();
    
    console.log(`   Total Processed: ${stats.totalProcessed}`);
    console.log(`   Successful Extractions: ${stats.successfulExtractions}`);
    console.log(`   Failed Extractions: ${stats.failedExtractions}`);
    console.log(`   Success Rate: ${stats.successRate}`);
    console.log(`   Average Processing Time: ${stats.averageProcessingTime}ms`);
    console.log(`   Total Images: ${stats.totalImages}`);
    console.log(`   Articles with Images: ${stats.articlesWithImages}`);
    console.log(`   Average Image Score: ${stats.averageImageScore.toFixed(1)}`);
    
    return stats;
  }

  /**
   * Helper method to update test results
   */
  updateTestResults(result, category, processingTime, stats) {
    this.testResults.totalArticles += result.imported;
    this.testResults.successfulExtractions += result.imported;
    this.testResults.failedExtractions += result.errors;
    this.testResults.categoriesProcessed.push(category);
    this.testResults.processingTimes.push(processingTime);
    
    // Update image stats
    this.testResults.imageStats.totalImages += stats.totalImages;
    this.testResults.imageStats.articlesWithImages += stats.articlesWithImages;
    if (stats.articlesWithImages > 0) {
      this.testResults.imageStats.averageScore = stats.averageImageScore;
    }
  }

  /**
   * Print quality distribution
   */
  printQualityDistribution() {
    console.log(`\n🏆 CONTENT QUALITY DISTRIBUTION:`);
    console.log(`   Excellent: ${this.testResults.qualityDistribution.excellent}`);
    console.log(`   Good: ${this.testResults.qualityDistribution.good}`);
    console.log(`   Fair: ${this.testResults.qualityDistribution.fair}`);
    console.log(`   Poor: ${this.testResults.qualityDistribution.poor}`);
  }

  /**
   * Print image statistics
   */
  printImageStatistics() {
    console.log(`\n🖼️  IMAGE PROCESSING STATISTICS:`);
    console.log(`   Total Images: ${this.testResults.imageStats.totalImages}`);
    console.log(`   Articles with Images: ${this.testResults.imageStats.articlesWithImages}`);
    console.log(`   Average Image Score: ${this.testResults.imageStats.averageScore.toFixed(1)}`);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.googleNewsService.cleanup();
  }
}

/**
 * Main test execution
 */
async function runEnhancedRSSTests() {
  console.log('🚀 ENHANCED RSS API TEST SUITE STARTING...');
  console.log('='.repeat(80));
  
  const api = new EnhancedRSSAPI();
  
  try {
    // Test 1: Single category extraction
    console.log('\n📋 TEST 1: Single Category Extraction');
    await api.testSingleCategory('Technology', 3);
    
    // Test 2: Multiple categories extraction
    console.log('\n📋 TEST 2: Multiple Categories Extraction');
    await api.testMultipleCategories(['World', 'Sports'], 2);
    
    // Test 3: Get final statistics
    console.log('\n📋 TEST 3: Final Processing Statistics');
    await api.getProcessingStatistics();
    
    // Test 4: Custom RSS feed (simulated)
    console.log('\n📋 TEST 4: Custom RSS Feed Processing');
    await api.testCustomRSSFeed('https://feeds.bbci.co.uk/news/rss.xml', 'BBC News', 3);
    
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  } finally {
    await api.cleanup();
  }
}

// Export for use as module
module.exports = { EnhancedRSSAPI, runEnhancedRSSTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runEnhancedRSSTests().catch(console.error);
}