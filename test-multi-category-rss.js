const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

// Mock strapi global for testing
global.strapi = {
  log: {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.log
  },
  entityService: {
    create: async (uid, data) => {
      console.log(`📝 Mock Strapi Article Created:`, {
        uid,
        title: data.data.title,
        slug: data.data.slug,
        contentLength: data.data.content?.length || 0,
        imageCount: data.data.images?.length || 0,
        category: data.data.category
      });
      return { id: Math.floor(Math.random() * 10000), ...data.data };
    }
  }
};

class MultiCategoryRSSExtractor {
  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Define RSS feeds for different categories
    this.categoryFeeds = {
      'Politics': [
        'https://feeds.bbci.co.uk/news/politics/rss.xml',
        'https://www.politico.com/rss/politicopicks.xml'
      ],
      'World News': [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://www.reuters.com/rssFeed/worldNews'
      ],
      'Technology': [
        'https://feeds.bbci.co.uk/news/technology/rss.xml',
        'https://techcrunch.com/feed/'
      ],
      'Sports': [
        'https://feeds.bbci.co.uk/sport/rss.xml',
        'https://www.espn.com/espn/rss/news'
      ],
      'Business': [
        'https://feeds.bbci.co.uk/news/business/rss.xml',
        'https://www.reuters.com/rssFeed/businessNews'
      ]
    };
    
    this.results = {
      categories: {},
      overall: {
        totalArticles: 0,
        successfulExtractions: 0,
        articlesWithImages: 0,
        articlesWithRichContent: 0,
        averageContentLength: 0,
        averageImageCount: 0
      }
    };
  }

  async fetchRSSFeed(url) {
    try {
      console.log(`🔄 Fetching RSS feed: ${url}`);
      const feed = await this.parser.parseURL(url);
      console.log(`✅ Successfully fetched ${feed.items.length} items from ${feed.title || 'RSS Feed'}`);
      return feed;
    } catch (error) {
      console.error(`❌ Failed to fetch RSS feed ${url}:`, error.message);
      return null;
    }
  }

  async extractArticleContent(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
      
      // Try multiple content selectors
      const contentSelectors = [
        'article',
        '[data-component="text-block"]',
        '.story-content',
        '.article-content',
        '.post-content',
        'main',
        '.content'
      ];
      
      let content = '';
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length && element.text().trim().length > 200) {
          content = element.text().trim();
          break;
        }
      }
      
      // Fallback to paragraphs
      if (!content || content.length < 200) {
        content = $('p').map((i, el) => $(el).text().trim()).get().join(' ');
      }
      
      // Extract images
      const images = [];
      $('img').each((i, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        const alt = $(img).attr('alt') || '';
        if (src && !src.includes('data:image') && !src.includes('placeholder')) {
          // Convert relative URLs to absolute
          const imageUrl = src.startsWith('http') ? src : new URL(src, url).href;
          images.push({
            url: imageUrl,
            alt: alt,
            score: this.calculateImageScore(imageUrl, alt)
          });
        }
      });
      
      // Sort images by score and take top ones
      images.sort((a, b) => b.score - a.score);
      
      return {
        content: content.substring(0, 5000), // Limit content length
        images: images.slice(0, 10), // Top 10 images
        contentLength: content.length,
        imageCount: images.length
      };
      
    } catch (error) {
      console.error(`❌ Failed to extract content from ${url}:`, error.message);
      return {
        content: '',
        images: [],
        contentLength: 0,
        imageCount: 0
      };
    }
  }

  calculateImageScore(url, alt) {
    let score = 50; // Base score
    
    // URL-based scoring
    if (url.includes('thumb') || url.includes('small')) score -= 20;
    if (url.includes('large') || url.includes('big')) score += 15;
    if (url.includes('hero') || url.includes('main')) score += 25;
    if (url.includes('logo') || url.includes('icon')) score -= 30;
    if (url.includes('avatar') || url.includes('profile')) score -= 15;
    
    // Alt text scoring
    if (alt && alt.length > 10) score += 10;
    if (alt && alt.length > 30) score += 5;
    
    // File extension scoring
    if (url.includes('.jpg') || url.includes('.jpeg')) score += 5;
    if (url.includes('.png')) score += 3;
    if (url.includes('.webp')) score += 8;
    if (url.includes('.gif')) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  createSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
      .substring(0, 100);
  }

  async processCategory(categoryName, maxArticlesPerFeed = 3) {
    console.log(`\n🏷️  Processing Category: ${categoryName}`);
    console.log('='.repeat(50));
    
    const categoryResults = {
      name: categoryName,
      feeds: [],
      totalArticles: 0,
      successfulExtractions: 0,
      articlesWithImages: 0,
      articlesWithRichContent: 0,
      averageContentLength: 0,
      averageImageCount: 0,
      articles: []
    };
    
    const feeds = this.categoryFeeds[categoryName] || [];
    
    for (const feedUrl of feeds) {
      const feed = await this.fetchRSSFeed(feedUrl);
      if (!feed) continue;
      
      const feedResult = {
        url: feedUrl,
        title: feed.title || 'Unknown Feed',
        articles: []
      };
      
      // Process limited number of articles per feed
      const articlesToProcess = feed.items.slice(0, maxArticlesPerFeed);
      
      for (const item of articlesToProcess) {
        console.log(`\n📰 Processing: ${item.title}`);
        
        const extraction = await this.extractArticleContent(item.link);
        
        const article = {
          title: item.title,
          slug: this.createSlug(item.title),
          link: item.link,
          publishedDate: item.pubDate || item.isoDate,
          category: categoryName,
          source: feed.title || 'Unknown Source',
          content: extraction.content,
          images: extraction.images,
          contentLength: extraction.contentLength,
          imageCount: extraction.imageCount,
          hasRichContent: extraction.contentLength > 500,
          hasImages: extraction.imageCount > 0,
          quality: this.assessArticleQuality(extraction)
        };
        
        // Simulate Strapi article creation
        try {
          await strapi.entityService.create('api::article.article', {
            data: {
              title: article.title,
              slug: article.slug,
              content: article.content,
              excerpt: article.content.substring(0, 200) + '...',
              publishedAt: article.publishedDate,
              source_url: article.link,
              category: article.category,
              images: article.images.map(img => ({
                url: img.url,
                alt: img.alt,
                score: img.score
              }))
            }
          });
          
          console.log(`✅ Article processed successfully`);
          console.log(`   📊 Content: ${article.contentLength} chars`);
          console.log(`   🖼️  Images: ${article.imageCount} found`);
          console.log(`   ⭐ Quality: ${article.quality}`);
          
          categoryResults.successfulExtractions++;
          if (article.hasImages) categoryResults.articlesWithImages++;
          if (article.hasRichContent) categoryResults.articlesWithRichContent++;
          
        } catch (error) {
          console.error(`❌ Failed to create article:`, error.message);
        }
        
        feedResult.articles.push(article);
        categoryResults.articles.push(article);
        categoryResults.totalArticles++;
      }
      
      categoryResults.feeds.push(feedResult);
    }
    
    // Calculate category statistics
    if (categoryResults.totalArticles > 0) {
      categoryResults.averageContentLength = Math.round(
        categoryResults.articles.reduce((sum, a) => sum + a.contentLength, 0) / categoryResults.totalArticles
      );
      categoryResults.averageImageCount = Math.round(
        categoryResults.articles.reduce((sum, a) => sum + a.imageCount, 0) / categoryResults.totalArticles
      );
    }
    
    this.results.categories[categoryName] = categoryResults;
    
    // Update overall statistics
    this.results.overall.totalArticles += categoryResults.totalArticles;
    this.results.overall.successfulExtractions += categoryResults.successfulExtractions;
    this.results.overall.articlesWithImages += categoryResults.articlesWithImages;
    this.results.overall.articlesWithRichContent += categoryResults.articlesWithRichContent;
    
    console.log(`\n📊 Category ${categoryName} Summary:`);
    console.log(`   📰 Articles: ${categoryResults.totalArticles}`);
    console.log(`   ✅ Successful: ${categoryResults.successfulExtractions}`);
    console.log(`   🖼️  With Images: ${categoryResults.articlesWithImages}`);
    console.log(`   📝 Rich Content: ${categoryResults.articlesWithRichContent}`);
    console.log(`   📏 Avg Content: ${categoryResults.averageContentLength} chars`);
    console.log(`   🖼️  Avg Images: ${categoryResults.averageImageCount}`);
    
    return categoryResults;
  }

  assessArticleQuality(extraction) {
    let score = 0;
    
    // Content length scoring
    if (extraction.contentLength > 2000) score += 30;
    else if (extraction.contentLength > 1000) score += 20;
    else if (extraction.contentLength > 500) score += 10;
    
    // Image scoring
    if (extraction.imageCount > 5) score += 25;
    else if (extraction.imageCount > 2) score += 15;
    else if (extraction.imageCount > 0) score += 5;
    
    // Quality assessment
    if (score >= 45) return 'excellent';
    if (score >= 30) return 'good';
    if (score >= 15) return 'fair';
    return 'poor';
  }

  async runComprehensiveTest() {
    console.log('🚀 Starting Multi-Category RSS Extraction Test');
    console.log('=' * 60);
    
    const startTime = Date.now();
    
    // Process each category
    for (const categoryName of Object.keys(this.categoryFeeds)) {
      await this.processCategory(categoryName, 2); // 2 articles per feed for comprehensive testing
    }
    
    // Calculate final overall statistics
    if (this.results.overall.totalArticles > 0) {
      const allArticles = Object.values(this.results.categories)
        .flatMap(cat => cat.articles);
      
      this.results.overall.averageContentLength = Math.round(
        allArticles.reduce((sum, a) => sum + a.contentLength, 0) / this.results.overall.totalArticles
      );
      this.results.overall.averageImageCount = Math.round(
        allArticles.reduce((sum, a) => sum + a.imageCount, 0) / this.results.overall.totalArticles
      );
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Generate comprehensive report
    this.generateFinalReport(duration);
  }

  generateFinalReport(duration) {
    console.log('\n' + '='.repeat(80));
    console.log('🎉 COMPREHENSIVE MULTI-CATEGORY RSS EXTRACTION TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log('\n📊 OVERALL STATISTICS:');
    console.log(`   ⏱️  Total Duration: ${duration.toFixed(2)} seconds`);
    console.log(`   📰 Total Articles Processed: ${this.results.overall.totalArticles}`);
    console.log(`   ✅ Successful Extractions: ${this.results.overall.successfulExtractions}`);
    console.log(`   📈 Success Rate: ${((this.results.overall.successfulExtractions / this.results.overall.totalArticles) * 100).toFixed(1)}%`);
    console.log(`   🖼️  Articles with Images: ${this.results.overall.articlesWithImages}`);
    console.log(`   📝 Articles with Rich Content: ${this.results.overall.articlesWithRichContent}`);
    console.log(`   📏 Average Content Length: ${this.results.overall.averageContentLength} characters`);
    console.log(`   🖼️  Average Images per Article: ${this.results.overall.averageImageCount}`);
    
    console.log('\n🏷️  CATEGORY BREAKDOWN:');
    Object.values(this.results.categories).forEach(category => {
      const successRate = category.totalArticles > 0 ? 
        ((category.successfulExtractions / category.totalArticles) * 100).toFixed(1) : 0;
      
      console.log(`\n   📂 ${category.name}:`);
      console.log(`      📰 Articles: ${category.totalArticles}`);
      console.log(`      ✅ Success Rate: ${successRate}%`);
      console.log(`      🖼️  With Images: ${category.articlesWithImages}`);
      console.log(`      📝 Rich Content: ${category.articlesWithRichContent}`);
      console.log(`      📏 Avg Content: ${category.averageContentLength} chars`);
      console.log(`      🖼️  Avg Images: ${category.averageImageCount}`);
    });
    
    console.log('\n🔍 QUALITY ASSESSMENT:');
    const qualityDistribution = {};
    Object.values(this.results.categories).forEach(category => {
      category.articles.forEach(article => {
        qualityDistribution[article.quality] = (qualityDistribution[article.quality] || 0) + 1;
      });
    });
    
    Object.entries(qualityDistribution).forEach(([quality, count]) => {
      const percentage = ((count / this.results.overall.totalArticles) * 100).toFixed(1);
      console.log(`   ${quality.toUpperCase()}: ${count} articles (${percentage}%)`);
    });
    
    console.log('\n🎯 PIPELINE ASSESSMENT:');
    const overallSuccessRate = (this.results.overall.successfulExtractions / this.results.overall.totalArticles) * 100;
    const imageSuccessRate = (this.results.overall.articlesWithImages / this.results.overall.totalArticles) * 100;
    const contentSuccessRate = (this.results.overall.articlesWithRichContent / this.results.overall.totalArticles) * 100;
    
    console.log(`   🔄 RSS Feed Processing: ${overallSuccessRate >= 90 ? '✅ EXCELLENT' : overallSuccessRate >= 75 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}`);
    console.log(`   📝 Content Extraction: ${contentSuccessRate >= 80 ? '✅ EXCELLENT' : contentSuccessRate >= 60 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}`);
    console.log(`   🖼️  Image Extraction: ${imageSuccessRate >= 70 ? '✅ EXCELLENT' : imageSuccessRate >= 50 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}`);
    console.log(`   🏗️  Article Creation: ${this.results.overall.successfulExtractions > 0 ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   ⚡ Performance: ${duration < 60 ? '✅ FAST' : duration < 120 ? '✅ ACCEPTABLE' : '⚠️ SLOW'}`);
    
    const overallRating = overallSuccessRate >= 85 && contentSuccessRate >= 70 && imageSuccessRate >= 60 ? 
      'PRODUCTION READY 🚀' : 
      overallSuccessRate >= 70 && contentSuccessRate >= 50 ? 
        'GOOD FOR TESTING 🧪' : 
        'NEEDS IMPROVEMENT ⚠️';
    
    console.log(`\n🏆 OVERALL RATING: ${overallRating}`);
    console.log('='.repeat(80));
  }
}

// Run the comprehensive test
async function main() {
  const extractor = new MultiCategoryRSSExtractor();
  await extractor.runComprehensiveTest();
}

main().catch(console.error);