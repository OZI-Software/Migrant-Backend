/**
 * Simple Enhanced RSS Test for Strapi Environment
 * Tests the enhanced RSS extraction with detailed logging
 */

const axios = require('axios');

/**
 * Test the enhanced RSS API endpoints
 */
async function testEnhancedRSSAPI() {
  console.log('🚀 TESTING ENHANCED RSS API ENDPOINTS');
  console.log('='.repeat(60));
  
  const baseURL = 'http://localhost:1337';
  
  try {
    // Test 1: Import news with enhanced logging
    console.log('\n📋 TEST 1: Enhanced News Import');
    console.log('-'.repeat(40));
    
    const importResponse = await axios.post(`${baseURL}/api/news/import`, {
      categories: ['Technology', 'World'],
      maxArticlesPerCategory: 3
    });
    
    console.log('✅ Import Response:', importResponse.data);
    
    // Test 2: Get processing statistics
    console.log('\n📋 TEST 2: Processing Statistics');
    console.log('-'.repeat(40));
    
    const statsResponse = await axios.get(`${baseURL}/api/news/stats`);
    console.log('📊 Statistics:', statsResponse.data);
    
    // Test 3: Get recent articles with extraction details
    console.log('\n📋 TEST 3: Recent Articles with Extraction Details');
    console.log('-'.repeat(40));
    
    const articlesResponse = await axios.get(`${baseURL}/api/articles?populate=*&sort=createdAt:desc&pagination[limit]=5`);
    
    if (articlesResponse.data.data && articlesResponse.data.data.length > 0) {
      console.log(`📰 Found ${articlesResponse.data.data.length} recent articles:`);
      
      articlesResponse.data.data.forEach((article, index) => {
        console.log(`\n   ${index + 1}. ${article.attributes.title}`);
        console.log(`      📝 Content: ${article.attributes.content?.length || 0} chars`);
        console.log(`      🖼️  Image: ${article.attributes.imageUrl ? 'Yes' : 'No'}`);
        console.log(`      📊 Read Time: ${article.attributes.readTime} min`);
        console.log(`      🏷️  Tags: ${article.attributes.tags?.join(', ') || 'None'}`);
        console.log(`      🔗 Source: ${article.attributes.sourceUrl}`);
      });
    } else {
      console.log('📰 No articles found');
    }
    
    console.log('\n🎉 ALL API TESTS COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('❌ API Test Error:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure Strapi is running on http://localhost:1337');
      console.log('   Run: npm run develop');
    }
  }
}

/**
 * Test RSS extraction directly (for development environment)
 */
async function testDirectRSSExtraction() {
  console.log('\n🔧 TESTING DIRECT RSS EXTRACTION');
  console.log('='.repeat(60));
  
  try {
    // This would be used in the Strapi console or development environment
    console.log('📝 Direct RSS extraction test would run here in Strapi environment');
    console.log('   Use this in Strapi console:');
    console.log('   const service = strapi.service("api::google-news-feed.google-news-feed");');
    console.log('   const result = await service.importNews(["Technology"], 2);');
    console.log('   console.log(result);');
    
  } catch (error) {
    console.error('❌ Direct extraction error:', error.message);
  }
}

/**
 * Create test RSS feed URLs for manual testing
 */
function printTestRSSFeeds() {
  console.log('\n📡 TEST RSS FEEDS FOR MANUAL VERIFICATION');
  console.log('='.repeat(60));
  
  const testFeeds = [
    { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'World' },
    { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Technology' },
    { name: 'BBC Sports', url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'Sports' },
    { name: 'Reuters World', url: 'https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best', category: 'World' },
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Technology' }
  ];
  
  testFeeds.forEach((feed, index) => {
    console.log(`${index + 1}. ${feed.name} (${feed.category})`);
    console.log(`   URL: ${feed.url}`);
  });
  
  console.log('\n💡 Use these feeds to test the enhanced extraction manually');
}

/**
 * Print enhanced logging examples
 */
function printEnhancedLoggingExamples() {
  console.log('\n📋 ENHANCED LOGGING EXAMPLES');
  console.log('='.repeat(60));
  
  console.log('🔍 Content Extraction Logging:');
  console.log('   [INFO] 🔍 Starting enhanced content extraction from: https://example.com/article');
  console.log('   [INFO] ✅ Content extraction successful using readability');
  console.log('   [INFO] 📊 Content stats: 1250 words, 5 raw images');
  console.log('   [INFO] 🖼️  Processing 5 images for optimization...');
  console.log('   [INFO] 🎯 Image optimization complete: 3 optimized images');
  console.log('   [INFO] 📈 Average image score: 78.5');
  console.log('   [INFO] 🏆 Content quality assessment: EXCELLENT');
  
  console.log('\n🔄 Article Transformation Logging:');
  console.log('   [INFO] 🔄 Transforming article: "Breaking News Title" from category: Technology');
  console.log('   [INFO] ✅ Enhanced extraction completed:');
  console.log('   [INFO]    📊 Method: readability');
  console.log('   [INFO]    📝 Content: 4567 chars (892 words)');
  console.log('   [INFO]    🖼️  Images: 3 optimized images');
  console.log('   [INFO]    🏆 Quality: EXCELLENT');
  console.log('   [INFO]    ⏱️  Processing time: 2340ms');
  console.log('   [INFO] 🎉 Article ready for creation: "Breaking News Title" (4 min read, 3 images)');
  
  console.log('\n🎉 Article Creation Logging:');
  console.log('   [INFO] 🎉 MOCK ARTICLE CREATED:');
  console.log('   [INFO] =====================================');
  console.log('   [INFO] 📰 Title: Breaking Technology News');
  console.log('   [INFO] 🔗 Slug: breaking-technology-news');
  console.log('   [INFO] 📝 Content Length: 4567 characters');
  console.log('   [INFO] 🖼️  Primary Image: https://example.com/image.jpg');
  console.log('   [INFO] 📊 Read Time: 4 minutes');
  console.log('   [INFO] 🏷️  Tags: Technology, Innovation, AI');
  console.log('   [INFO] 📍 Location: San Francisco');
  console.log('   [INFO] ⚡ Breaking News: Yes');
}

// Main execution
async function main() {
  console.log('🚀 ENHANCED RSS EXTRACTION TEST SUITE');
  console.log('='.repeat(80));
  
  // Print test information
  printTestRSSFeeds();
  printEnhancedLoggingExamples();
  
  // Test API endpoints (if Strapi is running)
  await testEnhancedRSSAPI();
  
  // Test direct extraction info
  await testDirectRSSExtraction();
  
  console.log('\n✅ Test suite completed. Check Strapi logs for detailed extraction information.');
}

// Export for use in Strapi
module.exports = {
  testEnhancedRSSAPI,
  testDirectRSSExtraction,
  printTestRSSFeeds,
  printEnhancedLoggingExamples
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}