const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

// Mock Strapi global for testing
global.strapi = {
  log: {
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    debug: (...args) => console.log('[DEBUG]', ...args)
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

// Simple content extraction function
async function extractArticleContent(url) {
  try {
    console.log(`🔄 Extracting content from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads').remove();
    
    // Try to find main content
    let content = '';
    let images = [];
    
    // Look for common article selectors
    const contentSelectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.story-body',
      '.article-body'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 200) {
        content = element.text().trim();
        break;
      }
    }
    
    // If no content found, try paragraphs
    if (!content) {
      const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
      content = paragraphs.filter(p => p.length > 50).join(' ');
    }
    
    // Extract images
    $('img').each((i, img) => {
      const src = $(img).attr('src');
      const alt = $(img).attr('alt') || '';
      const width = parseInt($(img).attr('width')) || 0;
      const height = parseInt($(img).attr('height')) || 0;
      
      if (src && !src.includes('data:') && !src.includes('base64')) {
        let fullUrl = src;
        if (src.startsWith('//')) {
          fullUrl = 'https:' + src;
        } else if (src.startsWith('/')) {
          const urlObj = new URL(url);
          fullUrl = urlObj.origin + src;
        }
        
        images.push({
          url: fullUrl,
          alt,
          width,
          height,
          score: calculateImageScore(width, height, src)
        });
      }
    });
    
    // Sort images by score
    images.sort((a, b) => b.score - a.score);
    
    return {
      success: true,
      content: content.substring(0, 2000), // Limit for display
      contentLength: content.length,
      images: images.slice(0, 10), // Top 10 images
      method: 'cheerio'
    };
    
  } catch (error) {
    console.log(`❌ Extraction failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      content: '',
      contentLength: 0,
      images: [],
      method: 'failed'
    };
  }
}

// Simple image scoring function
function calculateImageScore(width, height, src) {
  let score = 0;
  
  // Size scoring
  if (width > 300 && height > 200) score += 30;
  else if (width > 200 && height > 150) score += 20;
  else if (width > 100 && height > 100) score += 10;
  
  // Aspect ratio scoring
  if (width && height) {
    const ratio = width / height;
    if (ratio >= 1.2 && ratio <= 2.0) score += 20; // Good landscape ratio
    else if (ratio >= 0.8 && ratio <= 1.2) score += 15; // Square-ish
  }
  
  // Format scoring
  if (src.includes('.jpg') || src.includes('.jpeg')) score += 10;
  else if (src.includes('.png')) score += 8;
  else if (src.includes('.webp')) score += 12;
  
  // Avoid thumbnails and icons
  if (src.includes('thumb') || src.includes('icon') || src.includes('logo')) score -= 20;
  
  return Math.max(0, score);
}

// Fallback content recovery
function recoverContentFromRSS(rssItem) {
  console.log('🔄 Using RSS fallback recovery...');
  
  let content = '';
  let images = [];
  
  // Use RSS content if available
  if (rssItem.content) {
    content = rssItem.content.replace(/<[^>]*>/g, '').trim();
  } else if (rssItem.contentSnippet) {
    content = rssItem.contentSnippet.trim();
  } else if (rssItem.summary) {
    content = rssItem.summary.replace(/<[^>]*>/g, '').trim();
  }
  
  // Extract images from RSS content
  if (rssItem.content) {
    const $ = cheerio.load(rssItem.content);
    $('img').each((i, img) => {
      const src = $(img).attr('src');
      if (src && !src.includes('data:')) {
        images.push({
          url: src.startsWith('//') ? 'https:' + src : src,
          alt: $(img).attr('alt') || '',
          score: 50 // Default score for RSS images
        });
      }
    });
  }
  
  // Use enclosure images
  if (rssItem.enclosure && rssItem.enclosure.url) {
    images.push({
      url: rssItem.enclosure.url,
      alt: 'RSS Enclosure Image',
      score: 60
    });
  }
  
  return {
    success: content.length > 0,
    content: content.substring(0, 2000),
    contentLength: content.length,
    images: images.slice(0, 5),
    method: 'rss-fallback',
    fallbackUsed: true
  };
}

async function testRealRSSExtraction() {
  console.log('🚀 Starting Real RSS Extraction Test\n');
  
  // Test RSS feeds
  const testFeeds = [
    {
      name: 'BBC News',
      url: 'http://feeds.bbci.co.uk/news/rss.xml',
      category: 'world'
    },
    {
      name: 'Reuters Top News',
      url: 'http://feeds.reuters.com/reuters/topNews',
      category: 'news'
    }
  ];
  
  const parser = new Parser({
    timeout: 15000,
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
      
      // Test first 2 articles from each feed
      const articlesToTest = rssFeed.items.slice(0, 2);
      
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
        
        // Try primary extraction
        let extractedContent = await extractArticleContent(rssItem.link);
        
        if (extractedContent.success) {
          testResult.extractionSuccess = true;
          testResult.contentLength = extractedContent.contentLength;
          testResult.imageCount = extractedContent.images.length;
          testResult.extractionMethod = extractedContent.method;
          testResult.images = extractedContent.images;
          results.successfulExtractions++;
          
          if (extractedContent.images.length > 0) {
            results.articlesWithImages++;
          }
          
          console.log(`✅ Primary extraction successful!`);
          console.log(`📊 Content length: ${extractedContent.contentLength} characters`);
          console.log(`🖼️  Found ${extractedContent.images.length} images`);
          
          if (extractedContent.images.length > 0) {
            console.log(`🎯 Best image: ${extractedContent.images[0].url}`);
            console.log(`📸 Image scores: ${extractedContent.images.map(img => img.score).join(', ')}`);
          }
          
        } else {
          console.log(`❌ Primary extraction failed: ${extractedContent.error}`);
          testResult.errors.push(`Primary: ${extractedContent.error}`);
          
          // Try RSS fallback
          console.log('🔄 Trying RSS fallback...');
          const fallbackContent = recoverContentFromRSS(rssItem);
          
          if (fallbackContent.success) {
            testResult.extractionSuccess = true;
            testResult.contentLength = fallbackContent.contentLength;
            testResult.imageCount = fallbackContent.images.length;
            testResult.extractionMethod = fallbackContent.method;
            testResult.images = fallbackContent.images;
            testResult.fallbackUsed = true;
            results.successfulExtractions++;
            results.fallbackUsed++;
            
            if (fallbackContent.images.length > 0) {
              results.articlesWithImages++;
            }
            
            console.log(`✅ RSS fallback successful!`);
            console.log(`📊 Content length: ${fallbackContent.contentLength} characters`);
            console.log(`🖼️  Found ${fallbackContent.images.length} images from RSS`);
            
          } else {
            console.log(`❌ RSS fallback also failed`);
            testResult.errors.push('RSS fallback failed');
            results.failedExtractions++;
          }
        }
        
        results.testResults.push(testResult);
        console.log('─'.repeat(80));
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
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
  
  console.log(`\n🔍 DETAILED RESULTS:`);
  results.testResults.forEach((result, index) => {
    console.log(`\n   ${index + 1}. ${result.title.substring(0, 60)}...`);
    console.log(`      Feed: ${result.feedName}`);
    console.log(`      Success: ${result.extractionSuccess ? '✅' : '❌'}`);
    console.log(`      Method: ${result.extractionMethod}`);
    console.log(`      Content: ${result.contentLength} chars`);
    console.log(`      Images: ${result.imageCount}`);
    console.log(`      Fallback: ${result.fallbackUsed ? 'Yes' : 'No'}`);
    if (result.errors.length > 0) {
      console.log(`      Errors: ${result.errors.join(', ')}`);
    }
  });
  
  console.log(`\n🎯 FEATURE VERIFICATION:`);
  console.log(`   ✅ Article Content Extraction: ${results.successfulExtractions > 0 ? 'WORKING' : 'FAILED'}`);
  console.log(`   ✅ Image Extraction: ${results.articlesWithImages > 0 ? 'WORKING' : 'NO IMAGES FOUND'}`);
  console.log(`   ✅ RSS Fallback Mechanisms: ${results.fallbackUsed > 0 ? 'WORKING' : 'NOT TRIGGERED'}`);
  console.log(`   ✅ RSS Feed Processing: ${results.totalArticles > 0 ? 'WORKING' : 'FAILED'}`);
  
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
  
  console.log('\n' + '='.repeat(80));
  console.log('🎉 Real RSS Extraction Test Complete!');
  console.log('='.repeat(80));
  
  return results;
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