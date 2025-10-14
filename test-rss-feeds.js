const axios = require('axios');
const Parser = require('rss-parser');

async function testRSSFeeds() {
  const parser = new Parser();
  const baseUrl = 'https://news.google.com/rss';
  
  const feedUrls = {
    Politics: `${baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
    Economy: `${baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
    World: `${baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
    Security: `${baseUrl}/search?q=security+defense+military+terrorism+national+security&hl=en-US&gl=US&ceid=US:en&tbm=nws&tbs=qdr:d`,
    Law: `${baseUrl}/search?q=law+legal+court+justice+supreme+court+lawsuit&hl=en-US&gl=US&ceid=US:en&tbm=nws&tbs=qdr:d`,
    Science: `${baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
    Society: `${baseUrl}/search?q=society+social+community+culture+education+family&hl=en-US&gl=US&ceid=US:en&tbm=nws&tbs=qdr:d`,
    Culture: `${baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`,
    Sport: `${baseUrl}/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en`
  };

  console.log('🔍 Testing RSS Feed URLs for all categories...\n');

  for (const [category, url] of Object.entries(feedUrls)) {
    try {
      console.log(`📡 Testing ${category}...`);
      console.log(`   URL: ${url}`);
      
      const startTime = Date.now();
      const feed = await parser.parseURL(url);
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ SUCCESS: ${feed.items.length} items found (${duration}ms)`);
      
      if (feed.items.length > 0) {
        console.log(`   📰 Sample title: "${feed.items[0].title}"`);
        console.log(`   🔗 Sample link: ${feed.items[0].link}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      console.log(`   🔍 Error details:`, error.code || 'Unknown error');
    }
    
    console.log(''); // Empty line for readability
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🏁 RSS Feed testing completed!');
}

testRSSFeeds().catch(console.error);