const { ContentFallbackService } = require('./src/services/content-fallback');
const { EnhancedArticleExtractor } = require('./src/services/enhanced-article-extractor');

// Mock strapi for testing
global.strapi = {
  log: {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  }
};

async function testFallbackMechanisms() {
  console.log('🧪 Testing Content Fallback Mechanisms\n');
  
  const fallbackService = new ContentFallbackService();
  const extractor = new EnhancedArticleExtractor();
  
  // Test scenarios
  const testCases = [
    {
      name: 'Valid News Article (should succeed with normal extraction)',
      url: 'https://www.bbc.com/news/world-us-canada-67123456',
      rssItem: {
        title: 'Breaking: Major News Event Unfolds',
        content: '<p>This is a sample news article content from RSS feed.</p>',
        contentSnippet: 'This is a sample news article content from RSS feed.',
        description: 'A major news event has unfolded with significant implications.',
        link: 'https://www.bbc.com/news/world-us-canada-67123456'
      }
    },
    {
      name: 'Invalid URL (should use RSS fallback)',
      url: 'https://invalid-news-site-that-does-not-exist.com/article',
      rssItem: {
        title: 'Article from Invalid Site',
        content: '<p>This content should be used when the main site fails to load. It contains enough text to meet the minimum content requirements for a proper fallback.</p>',
        contentSnippet: 'This content should be used when the main site fails to load.',
        description: 'Fallback content from RSS when main extraction fails.',
        link: 'https://invalid-news-site-that-does-not-exist.com/article'
      }
    },
    {
      name: 'Blocked/Protected Site (should use meta tags fallback)',
      url: 'https://www.wsj.com/articles/sample-article-12345',
      rssItem: {
        title: 'Wall Street Journal Article',
        content: '<p>Brief RSS content that might not be sufficient.</p>',
        contentSnippet: 'Brief RSS content.',
        description: 'A Wall Street Journal article that might be behind paywall.',
        link: 'https://www.wsj.com/articles/sample-article-12345'
      }
    },
    {
      name: 'Minimal RSS Data (should create minimal content)',
      url: 'https://example.com/minimal-article',
      rssItem: {
        title: 'Minimal Article',
        contentSnippet: 'Very brief content.',
        link: 'https://example.com/minimal-article'
      }
    },
    {
      name: 'No RSS Data (should use basic scraping)',
      url: 'https://httpbin.org/html',
      rssItem: null
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`🔗 URL: ${testCase.url}`);
    
    try {
      // Test with enhanced extractor (includes fallback)
      console.log('   🔄 Testing Enhanced Extractor with Fallback...');
      const extractorResult = await extractor.extractArticleContentWithRSS(testCase.url, testCase.rssItem);
      
      console.log(`   ✅ Extraction Method: ${extractorResult.extractionMethod}`);
      console.log(`   📝 Title: ${extractorResult.title}`);
      console.log(`   📊 Content Length: ${extractorResult.content.length} chars`);
      console.log(`   📸 Images Found: ${extractorResult.images.length}`);
      console.log(`   ⏱️  Read Time: ${extractorResult.readTime} minutes`);
      console.log(`   🎯 Success: ${extractorResult.success}`);
      
      if (extractorResult.content.length > 100) {
        console.log(`   📄 Content Preview: ${extractorResult.content.substring(0, 150)}...`);
      }
      
      // Test direct fallback service
      console.log('   🔄 Testing Direct Fallback Service...');
      const fallbackResult = await fallbackService.recoverContent(testCase.url, testCase.rssItem);
      
      console.log(`   ✅ Fallback Method: ${fallbackResult.fallbackMethod}`);
      console.log(`   📝 Fallback Title: ${fallbackResult.title}`);
      console.log(`   📊 Fallback Content Length: ${fallbackResult.content.length} chars`);
      console.log(`   🎯 Fallback Success: ${fallbackResult.success}`);
      
      results.push({
        testCase: testCase.name,
        url: testCase.url,
        extractorSuccess: extractorResult.success,
        extractorMethod: extractorResult.extractionMethod,
        extractorContentLength: extractorResult.content.length,
        fallbackSuccess: fallbackResult.success,
        fallbackMethod: fallbackResult.fallbackMethod,
        fallbackContentLength: fallbackResult.content.length,
        hasImages: extractorResult.images.length > 0,
        readTime: extractorResult.readTime
      });
      
    } catch (error) {
      console.error(`   ❌ Test failed: ${error.message}`);
      results.push({
        testCase: testCase.name,
        url: testCase.url,
        error: error.message,
        extractorSuccess: false,
        fallbackSuccess: false
      });
    }
    
    console.log('   ⏳ Waiting 2 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('================');
  
  const successfulExtractions = results.filter(r => r.extractorSuccess).length;
  const successfulFallbacks = results.filter(r => r.fallbackSuccess).length;
  const withImages = results.filter(r => r.hasImages).length;
  const errors = results.filter(r => r.error).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Successful Extractions: ${successfulExtractions}/${results.length}`);
  console.log(`Successful Fallbacks: ${successfulFallbacks}/${results.length}`);
  console.log(`Tests with Images: ${withImages}/${results.length}`);
  console.log(`Errors: ${errors}/${results.length}`);
  
  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.testCase}`);
    console.log(`   URL: ${result.url}`);
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    } else {
      console.log(`   🔧 Extractor: ${result.extractorMethod} (${result.extractorSuccess ? 'Success' : 'Failed'})`);
      console.log(`   🛡️  Fallback: ${result.fallbackMethod} (${result.fallbackSuccess ? 'Success' : 'Failed'})`);
      console.log(`   📊 Content: ${result.extractorContentLength} chars`);
      console.log(`   📸 Images: ${result.hasImages ? 'Yes' : 'No'}`);
      console.log(`   ⏱️  Read Time: ${result.readTime} min`);
    }
  });

  // Test quality assessment
  console.log('\n🎯 Quality Assessment:');
  results.forEach((result, index) => {
    if (!result.error) {
      const isQuality = result.extractorContentLength >= 200 && 
                       result.extractorSuccess && 
                       result.extractorMethod !== 'Emergency Fallback: Minimal Content';
      console.log(`${index + 1}. ${result.testCase}: ${isQuality ? '✅ High Quality' : '⚠️  Basic Quality'}`);
    }
  });

  // Cleanup
  try {
    await extractor.cleanup();
    console.log('\n🧹 Cleanup completed successfully');
  } catch (cleanupError) {
    console.error(`🧹 Cleanup failed: ${cleanupError.message}`);
  }

  console.log('\n🎉 Fallback mechanism testing completed!');
}

// Test retry mechanism
async function testRetryMechanism() {
  console.log('\n\n🔄 Testing Retry Mechanism');
  console.log('===========================');
  
  const fallbackService = new ContentFallbackService();
  
  let attemptCount = 0;
  const testOperation = async () => {
    attemptCount++;
    console.log(`   Attempt ${attemptCount}`);
    
    if (attemptCount < 3) {
      throw new Error(`Simulated failure ${attemptCount}`);
    }
    
    return 'Success after retries';
  };
  
  try {
    const result = await fallbackService.withRetry(testOperation, 3);
    console.log(`   ✅ Result: ${result}`);
    console.log(`   📊 Total attempts: ${attemptCount}`);
  } catch (error) {
    console.error(`   ❌ Final failure: ${error.message}`);
  }
}

// Run tests
async function runAllTests() {
  try {
    await testFallbackMechanisms();
    await testRetryMechanism();
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Execute if run directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testFallbackMechanisms,
  testRetryMechanism,
  runAllTests
};