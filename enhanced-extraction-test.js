const { EnhancedArticleExtractor } = require('./src/services/enhanced-article-extractor');

async function testEnhancedExtraction() {
  console.log('🚀 Testing Enhanced Article Extraction\n');
  
  const extractor = new EnhancedArticleExtractor();
  
  // Test URLs from different news sources
  const testUrls = [
    {
      name: 'BBC News Article',
      url: 'https://www.bbc.com/news'
    },
    {
      name: 'Reuters Article',
      url: 'https://www.reuters.com/world/'
    },
    {
      name: 'CNN Article',
      url: 'https://edition.cnn.com/world'
    },
    {
      name: 'The Guardian Article',
      url: 'https://www.theguardian.com/world'
    },
    {
      name: 'Associated Press',
      url: 'https://apnews.com/hub/world-news'
    }
  ];

  const results = [];

  for (const testCase of testUrls) {
    console.log(`\n📰 Testing: ${testCase.name}`);
    console.log(`🔗 URL: ${testCase.url}`);
    console.log('⏳ Extracting content...\n');

    try {
      const startTime = Date.now();
      const result = await extractor.extractArticleContent(testCase.url);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ Extraction completed in ${duration}ms`);
      console.log(`📊 Method: ${result.extractionMethod}`);
      console.log(`📝 Success: ${result.success}`);
      
      if (result.success) {
        console.log(`📄 Title: ${result.title.substring(0, 100)}${result.title.length > 100 ? '...' : ''}`);
        console.log(`📖 Content Length: ${result.content.length} characters`);
        console.log(`📝 Word Count: ${result.wordCount} words`);
        console.log(`⏱️ Read Time: ${result.readTime} minutes`);
        console.log(`🖼️ Images Found: ${result.images.length}`);
        
        if (result.images.length > 0) {
          console.log(`🖼️ Sample Images:`);
          result.images.slice(0, 3).forEach((img, index) => {
            console.log(`   ${index + 1}. ${img.substring(0, 80)}${img.length > 80 ? '...' : ''}`);
          });
        }
        
        console.log(`📄 Excerpt: ${result.excerpt.substring(0, 200)}${result.excerpt.length > 200 ? '...' : ''}`);
        
        if (result.author) {
          console.log(`✍️ Author: ${result.author}`);
        }
        
        if (result.publishDate) {
          console.log(`📅 Publish Date: ${result.publishDate}`);
        }
      } else {
        console.log(`❌ Extraction failed: ${result.extractionMethod}`);
      }

      results.push({
        name: testCase.name,
        url: testCase.url,
        success: result.success,
        method: result.extractionMethod,
        contentLength: result.content.length,
        wordCount: result.wordCount,
        imageCount: result.images.length,
        duration: duration
      });

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      results.push({
        name: testCase.name,
        url: testCase.url,
        success: false,
        method: `Error: ${error.message}`,
        contentLength: 0,
        wordCount: 0,
        imageCount: 0,
        duration: 0
      });
    }

    console.log('\n' + '─'.repeat(80));
  }

  // Summary
  console.log('\n📊 EXTRACTION SUMMARY');
  console.log('═'.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful extractions: ${successful.length}/${results.length}`);
  console.log(`❌ Failed extractions: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    const avgContentLength = successful.reduce((sum, r) => sum + r.contentLength, 0) / successful.length;
    const avgWordCount = successful.reduce((sum, r) => sum + r.wordCount, 0) / successful.length;
    const avgImageCount = successful.reduce((sum, r) => sum + r.imageCount, 0) / successful.length;
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    
    console.log(`📊 Average content length: ${Math.round(avgContentLength)} characters`);
    console.log(`📊 Average word count: ${Math.round(avgWordCount)} words`);
    console.log(`📊 Average image count: ${Math.round(avgImageCount)} images`);
    console.log(`📊 Average extraction time: ${Math.round(avgDuration)}ms`);
  }
  
  console.log('\n📋 DETAILED RESULTS:');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Method: ${result.method}`);
    console.log(`   Content: ${result.contentLength} chars, ${result.wordCount} words`);
    console.log(`   Images: ${result.imageCount}`);
    console.log(`   Duration: ${result.duration}ms`);
  });

  // Cleanup
  await extractor.cleanup();
  console.log('\n🧹 Cleanup completed');
}

// Test Google News RSS URL resolution
async function testGoogleNewsResolution() {
  console.log('\n🔍 Testing Google News URL Resolution\n');
  
  const extractor = new EnhancedArticleExtractor();
  
  const googleNewsUrls = [
    'https://news.google.com/rss/articles/CBMiUWh0dHBzOi8vd3d3LmJiYy5jb20vbmV3cy93b3JsZC1ldXJvcGUtNjc4OTQyNzPSAVVodHRwczovL3d3dy5iYmMuY29tL25ld3Mvd29ybGQtZXVyb3BlLTY3ODk0MjczLmFtcA?oc=5',
    'https://news.google.com/rss/articles/CBMiVGh0dHBzOi8vd3d3LnJldXRlcnMuY29tL3dvcmxkL2V1cm9wZS91ay1icmV4aXQtZGVhbC1ldS0yMDIzLTEyLTI1L9IBAA?oc=5',
    'https://news.google.com/rss/search?q=politics&hl=en-US&gl=US&ceid=US:en'
  ];

  for (const url of googleNewsUrls) {
    console.log(`🔗 Testing URL: ${url.substring(0, 100)}...`);
    
    try {
      const result = await extractor.extractArticleContent(url);
      
      console.log(`📊 Method: ${result.extractionMethod}`);
      console.log(`📝 Success: ${result.success}`);
      
      if (result.success) {
        console.log(`📄 Title: ${result.title.substring(0, 80)}...`);
        console.log(`📖 Content: ${result.content.length} characters`);
        console.log(`🖼️ Images: ${result.images.length}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('─'.repeat(60));
  }

  await extractor.cleanup();
}

// Run tests
async function runAllTests() {
  try {
    await testEnhancedExtraction();
    await testGoogleNewsResolution();
    
    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  process.exit(0);
});

runAllTests();