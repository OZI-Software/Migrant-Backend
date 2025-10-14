const Parser = require('rss-parser');

async function testScienceFeed() {
  const parser = new Parser({
    customFields: {
      item: ['source']
    },
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const feedUrls = {
    Science: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
    World: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en'
  };

  console.log('🧪 Testing Science vs World RSS feed processing...\n');

  for (const [category, url] of Object.entries(feedUrls)) {
    try {
      console.log(`📡 Testing ${category} category...`);
      console.log(`URL: ${url}`);
      
      const feed = await parser.parseURL(url);
      console.log(`✅ RSS parsed successfully: ${feed.items.length} items`);
      
      // Map to GoogleNewsItem format (same as in the service)
      const allItems = feed.items.map(item => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        content: item.content || item.contentSnippet || '',
        contentSnippet: item.contentSnippet || '',
        guid: item.guid || item.link || '',
        source: item.source || 'Google News',
        description: item.contentSnippet || item.content || ''
      }));

      console.log(`📝 Mapped to GoogleNewsItem format: ${allItems.length} items`);

      // Apply quality filter (simplified version)
      const qualityItems = allItems.filter(item => {
        const title = item.title?.toLowerCase() || '';
        const link = item.link?.toLowerCase() || '';
        const description = item.description?.toLowerCase() || '';
        
        // Basic quality checks
        if (link.includes('.pdf') || title.includes('.pdf')) return false;
        if (title.length < 20) return false;
        if (description && description.length < 50) return false;
        
        return true;
      });

      console.log(`🔍 After quality filter: ${qualityItems.length} items`);
      console.log(`📊 Filtered out: ${allItems.length - qualityItems.length} items`);

      // Show first 3 quality items
      console.log(`\n📰 First 3 quality items for ${category}:`);
      qualityItems.slice(0, 3).forEach((item, index) => {
        console.log(`  ${index + 1}. "${item.title}"`);
        console.log(`     Link: ${item.link}`);
        console.log(`     Description length: ${item.description.length} chars`);
        console.log(`     Has title: ${!!item.title}`);
        console.log(`     Has link: ${!!item.link}`);
        console.log('');
      });

    } catch (error) {
      console.log(`❌ Error processing ${category}: ${error.message}`);
    }
    
    console.log('---\n');
  }
}

testScienceFeed().catch(console.error);