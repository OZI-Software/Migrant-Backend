const axios = require('axios');
const Parser = require('rss-parser');

async function debugScienceImport() {
  const parser = new Parser({
    customFields: {
      item: ['source']
    },
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const scienceUrl = 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en';
  
  console.log('🔬 Debugging Science category import...\n');
  console.log(`📡 Testing Science RSS URL: ${scienceUrl}\n`);

  try {
    // Step 1: Test RSS feed
    console.log('Step 1: Fetching RSS feed...');
    const feed = await parser.parseURL(scienceUrl);
    console.log(`✅ RSS feed fetched successfully: ${feed.items.length} items found\n`);

    // Step 2: Analyze first 3 items
    console.log('Step 2: Analyzing first 3 items...');
    const itemsToAnalyze = feed.items.slice(0, 3);
    
    for (let i = 0; i < itemsToAnalyze.length; i++) {
      const item = itemsToAnalyze[i];
      console.log(`\n--- Item ${i + 1} ---`);
      console.log(`Title: ${item.title}`);
      console.log(`Link: ${item.link}`);
      console.log(`PubDate: ${item.pubDate}`);
      console.log(`Content snippet: ${(item.contentSnippet || '').substring(0, 100)}...`);
      console.log(`Content: ${(item.content || '').substring(0, 100)}...`);
      
      // Check if required fields are present
      const hasTitle = item.title && item.title.trim().length > 0;
      const hasLink = item.link && item.link.trim().length > 0;
      
      console.log(`✅ Has title: ${hasTitle}`);
      console.log(`✅ Has link: ${hasLink}`);
      
      if (!hasTitle || !hasLink) {
        console.log(`❌ ISSUE: Missing required fields!`);
      }
      
      // Test URL accessibility
      if (hasLink) {
        try {
          console.log(`🔗 Testing URL accessibility...`);
          const response = await axios.head(item.link, {
            timeout: 5000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          console.log(`✅ URL accessible: ${response.status}`);
        } catch (urlError) {
          console.log(`❌ URL not accessible: ${urlError.message}`);
        }
      }
    }

    // Step 3: Test the import endpoint
    console.log('\n\nStep 3: Testing import endpoint...');
    try {
      const importResponse = await axios.post('http://localhost:1337/api/news-feed/import', {
        categories: ['Science'],
        maxArticlesPerCategory: 3
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Import endpoint response:`, importResponse.data);
    } catch (importError) {
      console.log(`❌ Import endpoint error:`, importError.response?.data || importError.message);
    }

  } catch (error) {
    console.log(`❌ Error during debugging: ${error.message}`);
    console.log(`Stack trace:`, error.stack);
  }
}

debugScienceImport().catch(console.error);