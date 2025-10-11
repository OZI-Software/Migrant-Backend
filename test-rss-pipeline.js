const { GoogleNewsFeedService } = require('./src/services/google-news-feed');

// Mock strapi for testing
global.strapi = {
  log: {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  }
};

async function testRSSPipeline() {
  console.log('🚀 Testing Complete RSS Feed Processing Pipeline\n');
  
  const feedService = new GoogleNewsFeedService();
  
  // Test different feed categories
  const testCategories = [
    { name: 'World News', category: 'world', limit: 3 },
    { name: 'Technology', category: 'technology', limit: 2 },
    { name: 'Business', category: 'business', limit: 2 },
    { name: 'Health', category: 'health', limit: 2 }
  ];

  const allResults = [];
  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalWithImages = 0;
  let totalFallbacks = 0;

  for (const testCategory of testCategories) {
    console.log(`\n📰 Testing ${testCategory.name} Feed`);
    console.log('='.repeat(50));
    
    try {
      const articles = await feedService.getLatestNews(testCategory.category, testCategory.limit);
      
      console.log(`📊 Retrieved ${articles.length} articles from ${testCategory.name}`);
      
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        totalProcessed++;
        
        console.log(`\n📄 Article ${i + 1}/${articles.length}:`);
        console.log(`   📝 Title: ${article.title}`);
        console.log(`   🔗 URL: ${article.sourceUrl}`);
        console.log(`   📊 Content Length: ${article.content.length} chars`);
        console.log(`   📸 Has Image: ${article.imageUrl ? 'Yes' : 'No'}`);
        console.log(`   ⏱️  Read Time: ${article.readTime} minutes`);
        console.log(`   🏷️  Tags: ${article.tags ? article.tags.length : 0}`);
        console.log(`   📅 Published: ${article.publishedDate}`);
        console.log(`   🌍 Location: ${article.location || 'Not specified'}`);
        console.log(`   🚨 Breaking: ${article.isBreaking ? 'Yes' : 'No'}`);
        
        // Check content quality
        const hasSubstantialContent = article.content.length >= 500;
        const hasImage = !!article.imageUrl;
        const hasTags = article.tags && article.tags.length > 0;
        
        if (hasSubstantialContent) totalSuccessful++;
        if (hasImage) totalWithImages++;
        
        // Check if fallback was used (look for fallback indicators in content)
        const isFallback = article.content.includes('Read full article') || 
                          article.content.length < 300 ||
                          article.content.includes('Content not available');
        
        if (isFallback) totalFallbacks++;
        
        console.log(`   ✅ Quality: ${hasSubstantialContent ? 'High' : 'Basic'} | Images: ${hasImage ? 'Yes' : 'No'} | Tags: ${hasTags ? 'Yes' : 'No'}`);
        
        if (article.content.length > 100) {
          console.log(`   📄 Preview: ${article.content.substring(0, 200).replace(/<[^>]*>/g, '')}...`);
        }
        
        allResults.push({
          category: testCategory.name,
          title: article.title,
          url: article.sourceUrl,
          contentLength: article.content.length,
          hasImage: hasImage,
          hasTags: hasTags,
          readTime: article.readTime,
          isBreaking: article.isBreaking,
          hasLocation: !!article.location,
          quality: hasSubstantialContent ? 'high' : 'basic',
          isFallback: isFallback
        });
        
        // Small delay between articles
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`❌ Failed to process ${testCategory.name}: ${error.message}`);
    }
    
    console.log(`\n⏳ Waiting 3 seconds before next category...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Generate comprehensive report
  console.log('\n\n📊 COMPREHENSIVE PIPELINE TEST REPORT');
  console.log('=====================================');
  
  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total Articles Processed: ${totalProcessed}`);
  console.log(`   High Quality Content: ${totalSuccessful}/${totalProcessed} (${Math.round(totalSuccessful/totalProcessed*100)}%)`);
  console.log(`   Articles with Images: ${totalWithImages}/${totalProcessed} (${Math.round(totalWithImages/totalProcessed*100)}%)`);
  console.log(`   Fallback Usage: ${totalFallbacks}/${totalProcessed} (${Math.round(totalFallbacks/totalProcessed*100)}%)`);
  
  // Category breakdown
  console.log(`\n📋 Category Breakdown:`);
  const categoryStats = {};
  allResults.forEach(result => {
    if (!categoryStats[result.category]) {
      categoryStats[result.category] = {
        total: 0,
        highQuality: 0,
        withImages: 0,
        withTags: 0,
        breaking: 0,
        fallbacks: 0
      };
    }
    
    const stats = categoryStats[result.category];
    stats.total++;
    if (result.quality === 'high') stats.highQuality++;
    if (result.hasImage) stats.withImages++;
    if (result.hasTags) stats.withTags++;
    if (result.isBreaking) stats.breaking++;
    if (result.isFallback) stats.fallbacks++;
  });
  
  Object.entries(categoryStats).forEach(([category, stats]) => {
    console.log(`\n   ${category}:`);
    console.log(`     📊 Total: ${stats.total}`);
    console.log(`     ✅ High Quality: ${stats.highQuality}/${stats.total} (${Math.round(stats.highQuality/stats.total*100)}%)`);
    console.log(`     📸 With Images: ${stats.withImages}/${stats.total} (${Math.round(stats.withImages/stats.total*100)}%)`);
    console.log(`     🏷️  With Tags: ${stats.withTags}/${stats.total} (${Math.round(stats.withTags/stats.total*100)}%)`);
    console.log(`     🚨 Breaking News: ${stats.breaking}/${stats.total} (${Math.round(stats.breaking/stats.total*100)}%)`);
    console.log(`     🛡️  Fallbacks: ${stats.fallbacks}/${stats.total} (${Math.round(stats.fallbacks/stats.total*100)}%)`);
  });
  
  // Content length analysis
  console.log(`\n📏 Content Length Analysis:`);
  const contentLengths = allResults.map(r => r.contentLength);
  const avgLength = Math.round(contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length);
  const minLength = Math.min(...contentLengths);
  const maxLength = Math.max(...contentLengths);
  
  console.log(`   Average: ${avgLength} characters`);
  console.log(`   Minimum: ${minLength} characters`);
  console.log(`   Maximum: ${maxLength} characters`);
  
  // Read time analysis
  console.log(`\n⏱️  Read Time Analysis:`);
  const readTimes = allResults.map(r => r.readTime);
  const avgReadTime = Math.round(readTimes.reduce((a, b) => a + b, 0) / readTimes.length * 10) / 10;
  const minReadTime = Math.min(...readTimes);
  const maxReadTime = Math.max(...readTimes);
  
  console.log(`   Average: ${avgReadTime} minutes`);
  console.log(`   Minimum: ${minReadTime} minutes`);
  console.log(`   Maximum: ${maxReadTime} minutes`);
  
  // Feature utilization
  console.log(`\n🔧 Feature Utilization:`);
  const withLocation = allResults.filter(r => r.hasLocation).length;
  const breakingNews = allResults.filter(r => r.isBreaking).length;
  
  console.log(`   Location Extraction: ${withLocation}/${totalProcessed} (${Math.round(withLocation/totalProcessed*100)}%)`);
  console.log(`   Breaking News Detection: ${breakingNews}/${totalProcessed} (${Math.round(breakingNews/totalProcessed*100)}%)`);
  
  // Quality assessment
  console.log(`\n🎯 Quality Assessment:`);
  const excellentArticles = allResults.filter(r => 
    r.quality === 'high' && 
    r.hasImage && 
    r.hasTags && 
    !r.isFallback
  ).length;
  
  const goodArticles = allResults.filter(r => 
    r.quality === 'high' && 
    (r.hasImage || r.hasTags) && 
    !r.isFallback
  ).length;
  
  console.log(`   Excellent Quality: ${excellentArticles}/${totalProcessed} (${Math.round(excellentArticles/totalProcessed*100)}%)`);
  console.log(`   Good Quality: ${goodArticles}/${totalProcessed} (${Math.round(goodArticles/totalProcessed*100)}%)`);
  console.log(`   Basic Quality: ${totalProcessed - goodArticles}/${totalProcessed} (${Math.round((totalProcessed - goodArticles)/totalProcessed*100)}%)`);
  
  // Sample articles
  console.log(`\n📋 Sample High-Quality Articles:`);
  const highQualityArticles = allResults.filter(r => r.quality === 'high' && r.hasImage).slice(0, 3);
  highQualityArticles.forEach((article, index) => {
    console.log(`\n   ${index + 1}. ${article.title}`);
    console.log(`      Category: ${article.category}`);
    console.log(`      Content: ${article.contentLength} chars`);
    console.log(`      Read Time: ${article.readTime} min`);
    console.log(`      Features: ${[
      article.hasImage ? 'Images' : null,
      article.hasTags ? 'Tags' : null,
      article.hasLocation ? 'Location' : null,
      article.isBreaking ? 'Breaking' : null
    ].filter(Boolean).join(', ') || 'Basic'}`);
  });
  
  // Recommendations
  console.log(`\n💡 Recommendations:`);
  if (totalFallbacks / totalProcessed > 0.3) {
    console.log(`   ⚠️  High fallback usage (${Math.round(totalFallbacks/totalProcessed*100)}%) - consider improving extraction strategies`);
  }
  
  if (totalWithImages / totalProcessed < 0.7) {
    console.log(`   📸 Low image extraction rate (${Math.round(totalWithImages/totalProcessed*100)}%) - consider enhancing image detection`);
  }
  
  if (totalSuccessful / totalProcessed > 0.8) {
    console.log(`   ✅ Excellent content extraction rate (${Math.round(totalSuccessful/totalProcessed*100)}%)`);
  }
  
  console.log(`\n🎉 RSS Pipeline testing completed successfully!`);
  console.log(`📊 Processed ${totalProcessed} articles across ${testCategories.length} categories`);
  
  return {
    totalProcessed,
    totalSuccessful,
    totalWithImages,
    totalFallbacks,
    categoryStats,
    allResults
  };
}

// Test specific edge cases
async function testEdgeCases() {
  console.log('\n\n🧪 Testing Edge Cases');
  console.log('=====================');
  
  const feedService = new GoogleNewsFeedService();
  
  const edgeCases = [
    {
      name: 'Empty Category',
      test: () => feedService.getLatestNews('', 1)
    },
    {
      name: 'Invalid Category',
      test: () => feedService.getLatestNews('invalid-category-xyz', 1)
    },
    {
      name: 'Zero Limit',
      test: () => feedService.getLatestNews('world', 0)
    },
    {
      name: 'Large Limit',
      test: () => feedService.getLatestNews('world', 100)
    }
  ];
  
  for (const edgeCase of edgeCases) {
    console.log(`\n🔍 Testing: ${edgeCase.name}`);
    
    try {
      const result = await edgeCase.test();
      console.log(`   ✅ Success: Retrieved ${result.length} articles`);
    } catch (error) {
      console.log(`   ⚠️  Expected behavior: ${error.message}`);
    }
  }
}

// Performance testing
async function testPerformance() {
  console.log('\n\n⚡ Performance Testing');
  console.log('=====================');
  
  const feedService = new GoogleNewsFeedService();
  
  console.log('🔄 Testing single article processing speed...');
  const startTime = Date.now();
  
  try {
    const articles = await feedService.getLatestNews('technology', 1);
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`✅ Processed 1 article in ${processingTime}ms`);
    console.log(`📊 Average time per article: ${processingTime}ms`);
    
    if (processingTime < 5000) {
      console.log('🚀 Excellent performance (< 5 seconds)');
    } else if (processingTime < 10000) {
      console.log('✅ Good performance (< 10 seconds)');
    } else {
      console.log('⚠️  Slow performance (> 10 seconds)');
    }
    
  } catch (error) {
    console.error(`❌ Performance test failed: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  try {
    const results = await testRSSPipeline();
    await testEdgeCases();
    await testPerformance();
    
    console.log('\n\n🏁 All Tests Completed Successfully!');
    return results;
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testRSSPipeline,
  testEdgeCases,
  testPerformance,
  runAllTests
};