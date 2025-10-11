const Parser = require('rss-parser');
const axios = require('axios');

// Mock Strapi global for testing
global.strapi = {
  log: {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.log
  },
  config: {
    get: (key) => {
      const configs = {
        'server.host': 'localhost',
        'server.port': 1337,
        'app.keys': ['test-key']
      };
      return configs[key];
    }
  }
};

async function testRealRSSExtraction() {
  console.log('🚀 Starting Real RSS Extraction Test\n');
  
  try {
    // Import our services
    const { GoogleNewsFeedService } = require('./src/services/google-news-feed');
    const { EnhancedArticleExtractor } = require('./src/services/enhanced-article-extractor');
    const { ContentFallbackService } = require('./src/services/content-fallback');
    const { ImageOptimizer } = require('./src/services/image-optimizer');
    
    // Initialize services
    const googleNewsService = new GoogleNewsFeedService();
    const articleExtractor = new EnhancedArticleExtractor();
    const fallbackService = new ContentFallbackService();
    const imageOptimizer = new ImageOptimizer();
    
    console.log('✅ Services initialized successfully\n');
    
    // Test RSS feeds from different sources
    const testFeeds = [
      {
        name: 'BBC News',
        url: 'http://feeds.bbci.co.uk/news/rss.xml',
        category: 'world'
      },
      {
        name: 'Reuters',
        url: 'http://feeds.reuters.com/reuters/topNews',
        category: 'news'
      },
      {
        name: 'CNN',
        url: 'http://rss.cnn.com/rss/edition.rss',
        category: 'news'
      }
    ];
    
    const parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const results = {
      totalArticles: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      articlesWithImages: 0,
      fallbackUsed: 0,
      averageContentLength: 0,
      averageImageCount: 0,
      testResults: []
    };
    
    for (const feed of testFeeds) {
      console.log(`📡 Testing feed: ${feed.name}`);
      console.log(`🔗 URL: ${feed.url}\n`);
      
      try {
        // Fetch RSS feed
        const rssFeed = await parser.parseURL(feed.url);
        console.log(`📰 Found ${rssFeed.items.length} articles in ${feed.name}\n`);
        
        // Test first 3 articles from each feed
        const articlesToTest = rssFeed.items.slice(0, 3);
        
        for (let i = 0; i < articlesToTest.length; i++) {
          const rssItem = articlesToTest[i];
          results.totalArticles++;
          
          console.log(`\n🔍 Testing Article ${i + 1}:`);
          console.log(`📝 Title: ${rssItem.title}`);
          console.log(`🔗 URL: ${rssItem.link}`);
          console.log(`📅 Published: ${rssItem.pubDate}`);
          
          const testResult = {
            feedName: feed.name,
            title: rssItem.title,
            url: rssItem.link,
            pubDate: rssItem.pubDate,
            extractionSuccess: false,
            contentLength: 0,
            imageCount: 0,
            fallbackUsed: false,
            extractionMethod: '',
            images: [],
            errors: []
          };
          
          try {
            // Test enhanced article extraction with RSS data
            console.log('🔄 Starting enhanced extraction...');
            const extractedContent = await articleExtractor.extractArticleContentWithRSS(
              rssItem.link,
              rssItem
            );
            
            if (extractedContent && extractedContent.content) {
              testResult.extractionSuccess = true;
              testResult.contentLength = extractedContent.content.length;
              testResult.extractionMethod = extractedContent.method || 'enhanced';
              results.successfulExtractions++;
              
              console.log(`✅ Extraction successful!`);
              console.log(`📊 Content length: ${extractedContent.content.length} characters`);
              console.log(`🔧 Method used: ${extractedContent.method || 'enhanced'}`);
              
              // Test image extraction and optimization
              if (extractedContent.images && extractedContent.images.length > 0) {
                testResult.imageCount = extractedContent.images.length;
                results.articlesWithImages++;
                
                console.log(`🖼️  Found ${extractedContent.images.length} images`);
                
                // Test image optimization
                try {
                  const optimizedImages = await imageOptimizer.optimizeImages(extractedContent.images);
                  const bestImage = await imageOptimizer.getBestImage(optimizedImages);
                  const imagesByUseCase = await imageOptimizer.getImagesByUseCase(optimizedImages);
                  
                  testResult.images = {
                    total: optimizedImages.length,
                    bestImage: bestImage ? bestImage.url : null,
                    hero: imagesByUseCase.hero.length,
                    thumbnail: imagesByUseCase.thumbnail.length,
                    gallery: imagesByUseCase.gallery.length
                  };
                  
                  console.log(`🎯 Best image: ${bestImage ? bestImage.url : 'None'}`);
                  console.log(`📸 Hero images: ${imagesByUseCase.hero.length}`);
                  console.log(`🖼️  Thumbnail images: ${imagesByUseCase.thumbnail.length}`);
                  console.log(`🖼️  Gallery images: ${imagesByUseCase.gallery.length}`);
                  
                } catch (imageError) {
                  console.log(`⚠️  Image optimization failed: ${imageError.message}`);
                  testResult.errors.push(`Image optimization: ${imageError.message}`);
                }
              } else {
                console.log('📷 No images found');
              }
              
              // Check if fallback was used
              if (extractedContent.fallbackUsed) {
                testResult.fallbackUsed = true;
                results.fallbackUsed++;
                console.log('🔄 Fallback mechanism was used');
              }
              
            } else {
              throw new Error('No content extracted');
            }
            
          } catch (extractionError) {
            console.log(`❌ Extraction failed: ${extractionError.message}`);
            testResult.errors.push(`Extraction: ${extractionError.message}`);
            results.failedExtractions++;
            
            // Test fallback service directly
            console.log('🔄 Testing fallback service directly...');
            try {
              const fallbackContent = await fallbackService.recoverContent(rssItem);
              if (fallbackContent && fallbackContent.content) {
                testResult.extractionSuccess = true;
                testResult.contentLength = fallbackContent.content.length;
                testResult.fallbackUsed = true;
                testResult.extractionMethod = 'fallback';
                results.successfulExtractions++;
                results.fallbackUsed++;
                
                console.log(`✅ Fallback recovery successful!`);
                console.log(`📊 Content length: ${fallbackContent.content.length} characters`);
              }
            } catch (fallbackError) {
              console.log(`❌ Fallback also failed: ${fallbackError.message}`);
              testResult.errors.push(`Fallback: ${fallbackError.message}`);
            }
          }
          
          results.testResults.push(testResult);
          console.log('─'.repeat(80));
        }
        
      } catch (feedError) {
        console.log(`❌ Failed to fetch RSS feed ${feed.name}: ${feedError.message}\n`);
      }
    }
    
    // Calculate statistics
    results.averageContentLength = results.testResults
      .filter(r => r.extractionSuccess)
      .reduce((sum, r) => sum + r.contentLength, 0) / results.successfulExtractions || 0;
    
    results.averageImageCount = results.testResults
      .reduce((sum, r) => sum + r.imageCount, 0) / results.totalArticles || 0;
    
    // Print comprehensive results
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📈 OVERALL STATISTICS:`);
    console.log(`   Total Articles Tested: ${results.totalArticles}`);
    console.log(`   Successful Extractions: ${results.successfulExtractions}`);
    console.log(`   Failed Extractions: ${results.failedExtractions}`);
    console.log(`   Success Rate: ${((results.successfulExtractions / results.totalArticles) * 100).toFixed(1)}%`);
    console.log(`   Articles with Images: ${results.articlesWithImages}`);
    console.log(`   Fallback Used: ${results.fallbackUsed} times`);
    console.log(`   Average Content Length: ${Math.round(results.averageContentLength)} characters`);
    console.log(`   Average Images per Article: ${results.averageImageCount.toFixed(1)}`);
    
    console.log(`\n🔍 DETAILED RESULTS BY FEED:`);
    const feedStats = {};
    results.testResults.forEach(result => {
      if (!feedStats[result.feedName]) {
        feedStats[result.feedName] = {
          total: 0,
          successful: 0,
          withImages: 0,
          fallbackUsed: 0
        };
      }
      feedStats[result.feedName].total++;
      if (result.extractionSuccess) feedStats[result.feedName].successful++;
      if (result.imageCount > 0) feedStats[result.feedName].withImages++;
      if (result.fallbackUsed) feedStats[result.feedName].fallbackUsed++;
    });
    
    Object.entries(feedStats).forEach(([feedName, stats]) => {
      console.log(`\n   ${feedName}:`);
      console.log(`     Success Rate: ${((stats.successful / stats.total) * 100).toFixed(1)}%`);
      console.log(`     Articles with Images: ${stats.withImages}/${stats.total}`);
      console.log(`     Fallback Used: ${stats.fallbackUsed} times`);
    });
    
    console.log(`\n🎯 FEATURE VERIFICATION:`);
    console.log(`   ✅ Enhanced Article Extraction: ${results.successfulExtractions > 0 ? 'WORKING' : 'FAILED'}`);
    console.log(`   ✅ Image Optimization: ${results.articlesWithImages > 0 ? 'WORKING' : 'NO IMAGES FOUND'}`);
    console.log(`   ✅ Fallback Mechanisms: ${results.fallbackUsed > 0 ? 'WORKING' : 'NOT TRIGGERED'}`);
    console.log(`   ✅ RSS Integration: ${results.totalArticles > 0 ? 'WORKING' : 'FAILED'}`);
    
    console.log(`\n🏆 QUALITY ASSESSMENT:`);
    const qualityScore = (results.successfulExtractions / results.totalArticles) * 100;
    if (qualityScore >= 90) {
      console.log(`   🌟 EXCELLENT (${qualityScore.toFixed(1)}%) - Pipeline working perfectly!`);
    } else if (qualityScore >= 75) {
      console.log(`   ✅ GOOD (${qualityScore.toFixed(1)}%) - Pipeline working well with minor issues`);
    } else if (qualityScore >= 50) {
      console.log(`   ⚠️  FAIR (${qualityScore.toFixed(1)}%) - Pipeline working but needs improvement`);
    } else {
      console.log(`   ❌ POOR (${qualityScore.toFixed(1)}%) - Pipeline needs significant fixes`);
    }
    
    // Show failed extractions for debugging
    const failedResults = results.testResults.filter(r => !r.extractionSuccess);
    if (failedResults.length > 0) {
      console.log(`\n🔍 FAILED EXTRACTIONS (for debugging):`);
      failedResults.forEach((result, index) => {
        console.log(`\n   ${index + 1}. ${result.title}`);
        console.log(`      URL: ${result.url}`);
        console.log(`      Errors: ${result.errors.join(', ')}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 Real RSS Extraction Test Complete!');
    console.log('='.repeat(80));
    
    return results;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testRealRSSExtraction()
    .then(results => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testRealRSSExtraction };