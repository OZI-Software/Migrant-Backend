const Parser = require('rss-parser');

async function testGoogleNewsRSSFeed() {
  console.log('Testing Google News RSS Feed...\n');
  
  const parser = new Parser({
    customFields: {
      item: ['source', 'pubDate', 'description']
    }
  });

  // Test different Google News RSS feeds
  const testFeeds = [
    {
      name: 'Top Stories',
      url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en'
    },
    {
      name: 'Politics News',
      url: 'https://news.google.com/rss/search?q=politics&hl=en-US&gl=US&ceid=US:en'
    },
       {
      name: 'Economy News',
      url: 'https://news.google.com/rss/search?q=economy&hl=en-US&gl=US&ceid=US:en'
    },
    {
      name: 'World News',
      url: 'https://news.google.com/rss/search?q=world&hl=en-US&gl=US&ceid=US:en'
    },
    {
      name: 'Security News',
      url: 'https://news.google.com/rss/search?q=economy&hl=en-US&gl=US&ceid=US:en'
    },
       {
      name: 'Law News',
      url: 'https://news.google.com/rss/search?q=law&hl=en-US&gl=US&ceid=US:en'
    },
       {
      name: 'Science News',
      url: 'https://news.google.com/rss/search?q=science&hl=en-US&gl=US&ceid=US:en'
    },
       {
      name: 'Society News',
      url: 'https://news.google.com/rss/search?q=society&hl=en-US&gl=US&ceid=US:en'
    },
       {
      name: 'Culture News',
      url: 'https://news.google.com/rss/search?q=culture&hl=en-US&gl=US&ceid=US:en'
    },
       {
      name: 'Sport News',
      url: 'https://news.google.com/rss/search?q=sport&hl=en-US&gl=US&ceid=US:en'
    },
  ];

  for (const feed of testFeeds) {
    try {
      console.log(`Testing ${feed.name}...`);
      console.log(`URL: ${feed.url}`);
      
      const feedData = await parser.parseURL(feed.url);
      
      console.log(`Feed Title: ${feedData.title}`);
      console.log(`Total Articles: ${feedData.items.length}`);
      
      if (feedData.items.length > 0) {
        const firstArticle = feedData.items[0];
        console.log(`\nSample Article:`);
        console.log(`   Title: ${firstArticle.title}`);
        console.log(`   Link: ${firstArticle.link}`);
        console.log(`   Published: ${firstArticle.pubDate}`);
        console.log(`   Source: ${firstArticle.source || 'N/A'}`);
        console.log(`   Description: ${firstArticle.contentSnippet ? firstArticle.contentSnippet.substring(0, 100) + '...' : 'N/A'}`);
      }
      
      console.log(`\n${feed.name} RSS feed is working correctly!\n`);
      console.log('─'.repeat(80) + '\n');
      
    } catch (error) {
      console.error(`Error testing ${feed.name}:`, error.message);
      console.log('─'.repeat(80) + '\n');
    }
  }
}

// Test RSS feed parsing
testGoogleNewsRSSFeed().then(() => {
  console.log('RSS Feed testing completed!');
}).catch((error) => {
  console.error('RSS Feed testing failed:', error);
});