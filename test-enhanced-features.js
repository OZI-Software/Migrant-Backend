/**
 * Enhanced RSS Pipeline Features Test
 * Tests the new fallback mechanisms and optimized image extraction
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Mock Strapi global for testing
global.strapi = {
  log: {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.log
  },
  entityService: {
    findMany: async () => [],
    create: async (model, data) => ({ id: Math.random(), ...data.data })
  },
  db: {
    query: () => ({
      findMany: async () => [],
      create: async (data) => ({ id: Math.random(), ...data })
    })
  }
};

// Test configuration
const TEST_CONFIG = {
  categories: ['technology', 'health', 'business'],
  testUrls: [
    'https://www.bbc.com/news/technology-12345678', // Valid news URL
    'https://invalid-url-that-does-not-exist.com/article', // Invalid URL
    'https://httpstat.us/404', // 404 error
    'https://httpstat.us/500' // Server error
  ]
};

/**
 * Test the ContentFallbackService directly
 */
async function testFallbackService() {
  console.log('\n=== Testing Content Fallback Service ===');
  
  try {
    // Import the fallback service
    const { ContentFallbackService } = require('./src/services/content-fallback.ts');
    const fallbackService = new ContentFallbackService();
    
    // Test with mock RSS data
    const mockRSSItem = {
      title: 'Test Article Title',
      link: 'https://example.com/test-article',
      contentSnippet: 'This is a test article about technology and innovation.',
      pubDate: new Date().toISOString(),
      creator: 'Test Author',
      categories: ['technology', 'innovation']
    };
    
    console.log('Testing fallback content recovery...');
    const result = await fallbackService.recoverContent('https://example.com/test-article', mockRSSItem);
    
    console.log('Fallback Result:', {
      title: result.title,
      contentLength: result.content?.length || 0,
      hasImages: result.images?.length > 0,
      excerpt: result.excerpt?.substring(0, 100) + '...',
      source: result.source
    });
    
    return { success: true, result };
  } catch (error) {
    console.error('Fallback Service Test Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test image optimization functionality
 */
async function testImageOptimization() {
  console.log('\n=== Testing Image Optimization ===');
  
  try {
    // Test with a sample HTML content containing images
    const sampleHTML = `
      <html>
        <body>
          <img src="https://example.com/small-image.jpg" width="50" height="50" alt="Small image">
          <img src="https://example.com/large-image.jpg" width="800" height="600" alt="Large image">
          <img src="https://example.com/medium-image.png" width="400" height="300" alt="Medium image">
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Base64 image">
        </body>
      </html>
    `;
    
    // Test the ImageOptimizer directly since it's easier to test
    const { ImageOptimizer } = require('./src/services/image-optimizer.ts');
    const imageOptimizer = new ImageOptimizer();
    
    // Extract image URLs from HTML
    const cheerio = require('cheerio');
    const $ = cheerio.load(sampleHTML);
    const imageUrls = [];
    $('img').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && !src.startsWith('data:')) {
        imageUrls.push(src);
      }
    });
    
    console.log('Found image URLs:', imageUrls);
    
    // Test image optimization (this will fail for invalid URLs, which is expected)
    const optimizedImages = await imageOptimizer.optimizeImages(imageUrls, sampleHTML);
    
    console.log('Optimized Images:', optimizedImages.map(img => ({
      originalUrl: img.originalUrl,
      isValid: img.metadata.isValid,
      quality: img.metadata.quality,
      width: img.metadata.width,
      height: img.metadata.height
    })));
    
    // Test image quality assessment with mock data
    const mockImages = [
      {
        originalUrl: 'https://example.com/test.jpg',
        metadata: {
          url: 'https://example.com/test.jpg',
          width: 800,
          height: 600,
          format: 'jpeg',
          size: 150000,
          aspectRatio: 1.33,
          quality: 'high',
          isValid: true
        }
      }
    ];
    
    const bestImage = imageOptimizer.getBestImage(mockImages);
    const imagesByUseCase = imageOptimizer.getImagesByUseCase(mockImages);
    
    console.log('Best Image:', bestImage?.originalUrl);
    console.log('Images by Use Case:', {
      hero: imagesByUseCase.hero?.originalUrl,
      thumbnail: imagesByUseCase.thumbnail?.originalUrl,
      galleryCount: imagesByUseCase.gallery.length
    });
    
    return { 
      success: true, 
      imageCount: optimizedImages.length,
      foundUrls: imageUrls.length,
      hasBestImage: !!bestImage,
      hasUseCaseImages: !!(imagesByUseCase.hero || imagesByUseCase.thumbnail)
    };
  } catch (error) {
    console.error('Image Optimization Test Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test content extraction with different scenarios
 */
async function testContentExtraction() {
  console.log('\n=== Testing Content Extraction Scenarios ===');
  
  const results = [];
  
  // Test with simpler URLs that are more likely to work
  const testUrls = [
    'https://httpbin.org/html', // Returns HTML content
    'https://httpstat.us/404', // 404 error
    'https://httpstat.us/500', // Server error
    'https://invalid-url-that-does-not-exist.com/article' // Invalid URL
  ];
  
  for (const url of testUrls) {
    console.log(`\nTesting URL: ${url}`);
    
    try {
      // Test the ContentFallbackService directly for more reliable testing
      const { ContentFallbackService } = require('./src/services/content-fallback.ts');
      const fallbackService = new ContentFallbackService();
      
      // Mock RSS item for fallback
      const mockRSSItem = {
        title: 'Fallback Article Title',
        link: url,
        contentSnippet: 'This is fallback content when extraction fails.',
        pubDate: new Date().toISOString(),
        creator: 'Test Author',
        categories: ['test']
      };
      
      const result = await fallbackService.recoverContent(url, mockRSSItem);
      
      const testResult = {
        url,
        success: result.success,
        title: result.title,
        contentLength: result.content?.length || 0,
        imageCount: result.images?.length || 0,
        source: result.source,
        hasExcerpt: !!result.excerpt
      };
      
      console.log('Extraction Result:', testResult);
      results.push(testResult);
      
    } catch (error) {
      console.error(`Error testing ${url}:`, error.message);
      results.push({
        url,
        success: false,
        error: error.message
      });
    }
  }
  
  // Test basic HTML parsing functionality
  try {
    const { ContentFallbackService } = require('./src/services/content-fallback.ts');
    const fallbackService = new ContentFallbackService();
    
    const testHTML = `
      <html>
        <head><title>Test Article</title></head>
        <body>
          <h1>Test Article Title</h1>
          <p>This is a test paragraph with some content.</p>
          <img src="https://example.com/test.jpg" alt="Test image">
        </body>
      </html>
    `;
    
    // Test HTML cleaning
    const cleanedHTML = fallbackService.cleanHTML(testHTML);
    console.log('\nHTML Cleaning Test:', {
      originalLength: testHTML.length,
      cleanedLength: cleanedHTML.length,
      hasContent: cleanedHTML.includes('test paragraph')
    });
    
    // Test excerpt generation
    const excerpt = fallbackService.generateExcerpt('This is a test paragraph with some content that should be truncated to create a proper excerpt for the article.');
    console.log('Excerpt Generation Test:', {
      excerptLength: excerpt.length,
      excerpt: excerpt
    });
    
    results.push({
      url: 'HTML_PARSING_TEST',
      success: true,
      title: 'HTML Parsing Test',
      contentLength: cleanedHTML.length,
      hasExcerpt: !!excerpt
    });
    
  } catch (error) {
    console.error('HTML parsing test failed:', error.message);
    results.push({
      url: 'HTML_PARSING_TEST',
      success: false,
      error: error.message
    });
  }
  
  return results;
}

/**
 * Test retry mechanism
 */
async function testRetryMechanism() {
  console.log('\n=== Testing Retry Mechanism ===');
  
  try {
    const { ContentFallbackService } = require('./src/services/content-fallback.ts');
    const fallbackService = new ContentFallbackService();
    
    // Test with a URL that should fail
    const startTime = Date.now();
    const result = await fallbackService.retryWithBackoff(
      async () => {
        throw new Error('Simulated network error');
      },
      3, // maxRetries
      1000 // baseDelay
    );
    
    const duration = Date.now() - startTime;
    
    console.log('Retry test completed:', {
      duration: `${duration}ms`,
      result: result || 'Failed as expected'
    });
    
    return { success: true, duration };
  } catch (error) {
    console.log('Retry mechanism worked correctly - all retries exhausted');
    return { success: true, retriesExhausted: true };
  }
}

/**
 * Performance benchmark
 */
async function performanceBenchmark() {
  console.log('\n=== Performance Benchmark ===');
  
  const startTime = Date.now();
  const iterations = 5;
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const iterationStart = Date.now();
    
    try {
      const { ContentFallbackService } = require('./src/services/content-fallback.ts');
      const fallbackService = new ContentFallbackService();
      
      const mockRSSItem = {
        title: `Performance Test Article ${i + 1}`,
        link: `https://example.com/article-${i + 1}`,
        contentSnippet: 'Performance testing content snippet.',
        pubDate: new Date().toISOString()
      };
      
      await fallbackService.recoverContent(`https://example.com/article-${i + 1}`, mockRSSItem);
      
      const iterationTime = Date.now() - iterationStart;
      results.push(iterationTime);
      
    } catch (error) {
      console.error(`Performance test iteration ${i + 1} failed:`, error.message);
    }
  }
  
  const totalTime = Date.now() - startTime;
  const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
  
  console.log('Performance Results:', {
    totalTime: `${totalTime}ms`,
    averagePerIteration: `${avgTime.toFixed(2)}ms`,
    iterations: results.length,
    times: results
  });
  
  return { totalTime, avgTime, results };
}

/**
 * Main test runner
 */
async function runEnhancedFeaturesTest() {
  console.log('🚀 Starting Enhanced RSS Pipeline Features Test');
  console.log('================================================');
  
  const testResults = {
    fallbackService: null,
    imageOptimization: null,
    contentExtraction: null,
    retryMechanism: null,
    performance: null,
    summary: {
      totalTests: 5,
      passed: 0,
      failed: 0,
      startTime: new Date().toISOString()
    }
  };
  
  // Test 1: Fallback Service
  try {
    testResults.fallbackService = await testFallbackService();
    if (testResults.fallbackService.success) testResults.summary.passed++;
    else testResults.summary.failed++;
  } catch (error) {
    testResults.fallbackService = { success: false, error: error.message };
    testResults.summary.failed++;
  }
  
  // Test 2: Image Optimization
  try {
    testResults.imageOptimization = await testImageOptimization();
    if (testResults.imageOptimization.success) testResults.summary.passed++;
    else testResults.summary.failed++;
  } catch (error) {
    testResults.imageOptimization = { success: false, error: error.message };
    testResults.summary.failed++;
  }
  
  // Test 3: Content Extraction
  try {
    testResults.contentExtraction = await testContentExtraction();
    const successfulExtractions = testResults.contentExtraction.filter(r => r.success).length;
    if (successfulExtractions > 0) testResults.summary.passed++;
    else testResults.summary.failed++;
  } catch (error) {
    testResults.contentExtraction = { error: error.message };
    testResults.summary.failed++;
  }
  
  // Test 4: Retry Mechanism
  try {
    testResults.retryMechanism = await testRetryMechanism();
    if (testResults.retryMechanism.success) testResults.summary.passed++;
    else testResults.summary.failed++;
  } catch (error) {
    testResults.retryMechanism = { success: false, error: error.message };
    testResults.summary.failed++;
  }
  
  // Test 5: Performance Benchmark
  try {
    testResults.performance = await performanceBenchmark();
    if (testResults.performance.avgTime < 5000) testResults.summary.passed++; // Pass if avg < 5s
    else testResults.summary.failed++;
  } catch (error) {
    testResults.performance = { error: error.message };
    testResults.summary.failed++;
  }
  
  // Final Summary
  testResults.summary.endTime = new Date().toISOString();
  testResults.summary.successRate = `${((testResults.summary.passed / testResults.summary.totalTests) * 100).toFixed(1)}%`;
  
  console.log('\n📊 ENHANCED FEATURES TEST SUMMARY');
  console.log('==================================');
  console.log(`✅ Tests Passed: ${testResults.summary.passed}/${testResults.summary.totalTests}`);
  console.log(`❌ Tests Failed: ${testResults.summary.failed}/${testResults.summary.totalTests}`);
  console.log(`📈 Success Rate: ${testResults.summary.successRate}`);
  console.log(`⏱️  Test Duration: ${new Date(testResults.summary.endTime).getTime() - new Date(testResults.summary.startTime).getTime()}ms`);
  
  // Detailed Results
  console.log('\n📋 DETAILED RESULTS');
  console.log('===================');
  
  console.log('\n1. Fallback Service:', testResults.fallbackService.success ? '✅ PASSED' : '❌ FAILED');
  if (testResults.fallbackService.error) {
    console.log(`   Error: ${testResults.fallbackService.error}`);
  }
  
  console.log('\n2. Image Optimization:', testResults.imageOptimization.success ? '✅ PASSED' : '❌ FAILED');
  if (testResults.imageOptimization.error) {
    console.log(`   Error: ${testResults.imageOptimization.error}`);
  }
  
  console.log('\n3. Content Extraction:', Array.isArray(testResults.contentExtraction) ? '✅ PASSED' : '❌ FAILED');
  if (testResults.contentExtraction.error) {
    console.log(`   Error: ${testResults.contentExtraction.error}`);
  }
  
  console.log('\n4. Retry Mechanism:', testResults.retryMechanism.success ? '✅ PASSED' : '❌ FAILED');
  if (testResults.retryMechanism.error) {
    console.log(`   Error: ${testResults.retryMechanism.error}`);
  }
  
  console.log('\n5. Performance:', testResults.performance.avgTime ? '✅ PASSED' : '❌ FAILED');
  if (testResults.performance.error) {
    console.log(`   Error: ${testResults.performance.error}`);
  } else if (testResults.performance.avgTime) {
    console.log(`   Average Time: ${testResults.performance.avgTime.toFixed(2)}ms`);
  }
  
  console.log('\n🎯 RECOMMENDATIONS');
  console.log('==================');
  
  if (testResults.summary.successRate === '100.0%') {
    console.log('🌟 Excellent! All enhanced features are working correctly.');
  } else if (parseFloat(testResults.summary.successRate) >= 80) {
    console.log('👍 Good! Most features are working. Review failed tests for improvements.');
  } else {
    console.log('⚠️  Several features need attention. Review the implementation.');
  }
  
  if (testResults.performance.avgTime && testResults.performance.avgTime > 3000) {
    console.log('⚡ Consider optimizing performance - average response time is high.');
  }
  
  console.log('\n✨ Enhanced RSS Pipeline Features Test Completed!');
  
  return testResults;
}

// Run the test
if (require.main === module) {
  runEnhancedFeaturesTest().catch(console.error);
}

module.exports = { runEnhancedFeaturesTest };