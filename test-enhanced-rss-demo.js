/**
 * Enhanced RSS Extraction Demo
 * Demonstrates all the enhanced features integrated into google-news-feed.ts
 */

const axios = require('axios');
const Parser = require('rss-parser');

/**
 * Mock Enhanced Article Extractor for demonstration
 */
class MockEnhancedExtractor {
  async extractArticleContentWithRSS(url, rssItem) {
    console.log(`   🔍 [EXTRACTION] Starting enhanced content extraction from: ${url}`);
    
    // Simulate extraction process
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const methods = ['readability', 'cheerio', 'custom-patterns', 'puppeteer'];
    const selectedMethod = methods[Math.floor(Math.random() * methods.length)];
    
    const mockContent = {
      title: rssItem.title || 'Sample Article Title',
      content: `This is enhanced extracted content from ${url}. The article discusses important topics with detailed analysis and comprehensive coverage. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`.repeat(Math.floor(Math.random() * 5) + 1),
      images: [
        { url: 'https://example.com/image1.jpg', alt: 'Primary image', width: 800, height: 600 },
        { url: 'https://example.com/image2.jpg', alt: 'Secondary image', width: 600, height: 400 }
      ],
      author: 'John Doe',
      publishedDate: new Date().toISOString(),
      extractionMethod: selectedMethod,
      processingTime: Math.floor(Math.random() * 3000) + 500
    };
    
    console.log(`   ✅ [EXTRACTION] Content extraction successful using ${selectedMethod}`);
    console.log(`   📊 [EXTRACTION] Content stats: ${mockContent.content.split(' ').length} words, ${mockContent.images.length} raw images`);
    
    return mockContent;
  }
}

/**
 * Mock Image Optimizer for demonstration
 */
class MockImageOptimizer {
  async optimizeImages(images) {
    console.log(`   🖼️  [IMAGES] Processing ${images.length} images for optimization...`);
    
    // Simulate image optimization
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const optimizedImages = images.map((img, index) => ({
      url: img.url,
      alt: img.alt || `Optimized image ${index + 1}`,
      width: img.width || 800,
      height: img.height || 600,
      optimized: true,
      score: Math.floor(Math.random() * 40) + 60, // 60-100 score
      format: 'webp',
      size: Math.floor(Math.random() * 200) + 50 // KB
    }));
    
    const avgScore = optimizedImages.reduce((sum, img) => sum + img.score, 0) / optimizedImages.length;
    
    console.log(`   🎯 [IMAGES] Image optimization complete: ${optimizedImages.length} optimized images`);
    console.log(`   📈 [IMAGES] Average image score: ${avgScore.toFixed(1)}`);
    
    return optimizedImages;
  }
}

/**
 * Mock Content Fallback Service for demonstration
 */
class MockContentFallbackService {
  async getContentFallback(url, rssItem) {
    console.log(`   🔄 [FALLBACK] Using content fallback service for: ${url}`);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      content: `Fallback content extracted for ${rssItem.title}. This content was retrieved using alternative extraction methods when primary extraction failed.`,
      images: [{ url: 'https://example.com/fallback-image.jpg', alt: 'Fallback image' }],
      extractionMethod: 'fallback-service'
    };
  }
}

/**
 * Enhanced RSS Feed Service Demo
 */
class EnhancedRSSDemo {
  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Enhanced RSS Bot 1.0'
      }
    });
    
    this.articleExtractor = new MockEnhancedExtractor();
    this.imageOptimizer = new MockImageOptimizer();
    this.contentFallbackService = new MockContentFallbackService();
    
    this.processingStats = {
      totalProcessed: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      totalProcessingTime: 0,
      totalImages: 0,
      optimizedImages: 0
    };
  }

  /**
   * Assess content quality
   */
  assessContentQuality(content, images) {
    const wordCount = content.split(' ').length;
    const imageCount = images.length;
    
    let quality = 'POOR';
    if (wordCount > 500 && imageCount > 0) quality = 'EXCELLENT';
    else if (wordCount > 300) quality = 'GOOD';
    else if (wordCount > 150) quality = 'FAIR';
    
    return { quality, wordCount, imageCount };
  }

  /**
   * Enhanced content extraction with comprehensive logging
   */
  async fetchFullContent(url, rssItem) {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔍 [INFO] Starting enhanced content extraction from: ${url}`);
      
      // Extract content using enhanced extractor
      const extractedContent = await this.articleExtractor.extractArticleContentWithRSS(url, rssItem);
      
      // Optimize images
      const optimizedImages = await this.imageOptimizer.optimizeImages(extractedContent.images || []);
      
      // Assess content quality
      const { quality, wordCount, imageCount } = this.assessContentQuality(extractedContent.content, optimizedImages);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`   🏆 [QUALITY] Content quality assessment: ${quality}`);
      console.log(`   ⏱️  [TIMING] Processing time: ${processingTime}ms`);
      
      // Update stats
      this.updateProcessingStats(true, processingTime, optimizedImages.length);
      
      return {
        content: extractedContent.content,
        images: optimizedImages,
        extractionResult: {
          method: extractedContent.extractionMethod,
          success: true,
          contentQuality: quality,
          wordCount,
          imageCount: optimizedImages.length,
          processingTime
        }
      };
      
    } catch (error) {
      console.log(`   ❌ [ERROR] Content extraction failed: ${error.message}`);
      console.log(`   🔄 [FALLBACK] Attempting fallback extraction...`);
      
      try {
        const fallbackContent = await this.contentFallbackService.getContentFallback(url, rssItem);
        const optimizedImages = await this.imageOptimizer.optimizeImages(fallbackContent.images || []);
        
        const { quality, wordCount, imageCount } = this.assessContentQuality(fallbackContent.content, optimizedImages);
        const processingTime = Date.now() - startTime;
        
        console.log(`   ✅ [FALLBACK] Fallback extraction successful`);
        console.log(`   🏆 [QUALITY] Content quality assessment: ${quality}`);
        
        this.updateProcessingStats(true, processingTime, optimizedImages.length);
        
        return {
          content: fallbackContent.content,
          images: optimizedImages,
          extractionResult: {
            method: 'fallback-service',
            success: true,
            contentQuality: quality,
            wordCount,
            imageCount: optimizedImages.length,
            processingTime
          }
        };
        
      } catch (fallbackError) {
        const processingTime = Date.now() - startTime;
        console.log(`   ❌ [FALLBACK] Fallback extraction also failed: ${fallbackError.message}`);
        
        this.updateProcessingStats(false, processingTime, 0);
        
        return {
          content: rssItem.contentSnippet || rssItem.content || '',
          images: [],
          extractionResult: {
            method: 'none',
            success: false,
            contentQuality: 'POOR',
            wordCount: 0,
            imageCount: 0,
            processingTime
          }
        };
      }
    }
  }

  /**
   * Transform RSS item to article with enhanced extraction
   */
  async transformToArticle(item, category) {
    console.log(`\n🔄 [INFO] Transforming article: "${item.title}" from category: ${category}`);
    
    // Fetch enhanced content
    const { content, images, extractionResult } = await this.fetchFullContent(item.link, item);
    
    // Calculate read time
    const readTime = Math.ceil(extractionResult.wordCount / 200);
    
    // Extract tags (simplified)
    const tags = [category, 'RSS', 'Enhanced'];
    
    // Create article object
    const article = {
      title: item.title,
      slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      content: content,
      excerpt: content.substring(0, 200) + '...',
      imageUrl: images.length > 0 ? images[0].url : null,
      images: images,
      sourceUrl: item.link,
      publishedAt: item.pubDate || new Date().toISOString(),
      readTime: readTime,
      tags: tags,
      category: category,
      extractionResult: extractionResult
    };
    
    console.log(`   ✅ [INFO] Enhanced extraction completed:`);
    console.log(`   [INFO]    📊 Method: ${extractionResult.method}`);
    console.log(`   [INFO]    📝 Content: ${content.length} chars (${extractionResult.wordCount} words)`);
    console.log(`   [INFO]    🖼️  Images: ${images.length} optimized images`);
    console.log(`   [INFO]    🏆 Quality: ${extractionResult.contentQuality}`);
    console.log(`   [INFO]    ⏱️  Processing time: ${extractionResult.processingTime}ms`);
    
    console.log(`\n🎉 [INFO] Article ready for creation: "${article.title}" (${readTime} min read, ${images.length} images)`);
    
    return article;
  }

  /**
   * Update processing statistics
   */
  updateProcessingStats(success, processingTime, imageCount) {
    this.processingStats.totalProcessed++;
    if (success) {
      this.processingStats.successfulExtractions++;
    } else {
      this.processingStats.failedExtractions++;
    }
    this.processingStats.totalProcessingTime += processingTime;
    this.processingStats.totalImages += imageCount;
    this.processingStats.optimizedImages += imageCount;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    const avgProcessingTime = this.processingStats.totalProcessed > 0 
      ? this.processingStats.totalProcessingTime / this.processingStats.totalProcessed 
      : 0;
    
    const successRate = this.processingStats.totalProcessed > 0 
      ? (this.processingStats.successfulExtractions / this.processingStats.totalProcessed) * 100 
      : 0;
    
    return {
      ...this.processingStats,
      successRate: successRate.toFixed(1),
      avgProcessingTime: Math.round(avgProcessingTime)
    };
  }

  /**
   * Demo RSS processing
   */
  async processRSSDemo() {
    console.log('🚀 ENHANCED RSS EXTRACTION DEMO');
    console.log('='.repeat(80));
    
    // Sample RSS items for demo
    const sampleRSSItems = [
      {
        title: 'Breaking: New AI Technology Revolutionizes Healthcare',
        link: 'https://example.com/ai-healthcare-breakthrough',
        pubDate: new Date().toISOString(),
        contentSnippet: 'Revolutionary AI technology is transforming healthcare...'
      },
      {
        title: 'Global Climate Summit Reaches Historic Agreement',
        link: 'https://example.com/climate-summit-agreement',
        pubDate: new Date().toISOString(),
        contentSnippet: 'World leaders agree on unprecedented climate action...'
      },
      {
        title: 'Tech Giants Announce Major Partnership',
        link: 'https://example.com/tech-partnership',
        pubDate: new Date().toISOString(),
        contentSnippet: 'Leading technology companies form strategic alliance...'
      }
    ];
    
    const categories = ['Technology', 'World', 'Business'];
    const processedArticles = [];
    
    for (let i = 0; i < sampleRSSItems.length; i++) {
      const item = sampleRSSItems[i];
      const category = categories[i];
      
      try {
        const article = await this.transformToArticle(item, category);
        processedArticles.push(article);
        
        // Mock article creation
        console.log(`\n🎉 [INFO] MOCK ARTICLE CREATED:`);
        console.log(`   [INFO] =====================================`);
        console.log(`   [INFO] 📰 Title: ${article.title}`);
        console.log(`   [INFO] 🔗 Slug: ${article.slug}`);
        console.log(`   [INFO] 📝 Content Length: ${article.content.length} characters`);
        console.log(`   [INFO] 🖼️  Primary Image: ${article.imageUrl || 'None'}`);
        console.log(`   [INFO] 📊 Read Time: ${article.readTime} minutes`);
        console.log(`   [INFO] 🏷️  Tags: ${article.tags.join(', ')}`);
        console.log(`   [INFO] 📂 Category: ${article.category}`);
        console.log(`   [INFO] ⚡ Extraction Method: ${article.extractionResult.method}`);
        
      } catch (error) {
        console.log(`   ❌ [ERROR] Failed to process article: ${error.message}`);
      }
    }
    
    // Display final statistics
    const stats = this.getProcessingStats();
    console.log(`\n📊 FINAL PROCESSING STATISTICS`);
    console.log('='.repeat(50));
    console.log(`📈 Total Processed: ${stats.totalProcessed}`);
    console.log(`✅ Successful Extractions: ${stats.successfulExtractions}`);
    console.log(`❌ Failed Extractions: ${stats.failedExtractions}`);
    console.log(`🎯 Success Rate: ${stats.successRate}%`);
    console.log(`⏱️  Average Processing Time: ${stats.avgProcessingTime}ms`);
    console.log(`🖼️  Total Images Optimized: ${stats.optimizedImages}`);
    
    console.log(`\n✅ ENHANCED RSS DEMO COMPLETED SUCCESSFULLY!`);
    console.log(`📰 Processed ${processedArticles.length} articles with comprehensive logging`);
    
    return {
      processedArticles,
      statistics: stats
    };
  }
}

// Main execution
async function main() {
  const demo = new EnhancedRSSDemo();
  await demo.processRSSDemo();
}

// Export for use
module.exports = { EnhancedRSSDemo };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}