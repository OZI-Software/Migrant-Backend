const Parser = require('rss-parser');
const axios = require('axios');

async function debugTransformation() {
  console.log('🔍 Debugging Science category transformation process...\n');

  const parser = new Parser({
    customFields: {
      item: ['source']
    },
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  try {
    // Step 1: Fetch Science RSS feed
    console.log('1️⃣ Fetching Science RSS feed...');
    const feedUrl = 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en';
    const feed = await parser.parseURL(feedUrl);
    console.log(`✅ Fetched ${feed.items.length} items from Science RSS feed\n`);

    // Step 2: Map to GoogleNewsItem format
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

    // Step 3: Apply quality filter
    const qualityItems = allItems.filter(item => {
      const title = item.title?.toLowerCase() || '';
      const link = item.link?.toLowerCase() || '';
      const description = item.description?.toLowerCase() || '';
      
      // Basic quality checks (same as in service)
      if (link.includes('.pdf') || title.includes('.pdf')) return false;
      if (title.length < 20) return false;
      if (description && description.length < 50) return false;
      
      return true;
    });

    console.log(`2️⃣ After quality filter: ${qualityItems.length} items\n`);

    // Step 4: Test each item individually
    console.log('3️⃣ Testing individual items for transformation issues...\n');
    
    for (let i = 0; i < Math.min(3, qualityItems.length); i++) {
      const item = qualityItems[i];
      console.log(`📰 Testing item ${i + 1}: "${item.title}"`);
      console.log(`🔗 URL: ${item.link}`);
      
      // Test URL accessibility
      try {
        console.log('   🌐 Testing URL accessibility...');
        const response = await axios.head(item.link, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        console.log(`   ✅ URL accessible (Status: ${response.status})`);
      } catch (urlError) {
        console.log(`   ❌ URL not accessible: ${urlError.message}`);
        console.log(`   🔍 This might be causing transformation errors\n`);
        continue;
      }

      // Test title cleaning
      try {
        console.log('   🧹 Testing title cleaning...');
        // Simple title cleaning (basic version of what the service does)
        let cleanedTitle = item.title;
        
        // Remove common publisher suffixes
        const publisherPatterns = [
          / - [A-Z][a-zA-Z\s]+$/,  // " - Publisher Name"
          / \| [A-Z][a-zA-Z\s]+$/,  // " | Publisher Name"
          / \([A-Z][a-zA-Z\s]+\)$/  // " (Publisher Name)"
        ];
        
        for (const pattern of publisherPatterns) {
          cleanedTitle = cleanedTitle.replace(pattern, '');
        }
        
        console.log(`   ✅ Title cleaned: "${cleanedTitle}"`);
        
        if (cleanedTitle.trim().length === 0) {
          console.log(`   ❌ Title became empty after cleaning!`);
          console.log(`   🔍 This might be causing transformation errors\n`);
          continue;
        }
        
      } catch (titleError) {
        console.log(`   ❌ Title cleaning failed: ${titleError.message}`);
        console.log(`   🔍 This might be causing transformation errors\n`);
        continue;
      }

      // Test slug generation
      try {
        console.log('   🏷️ Testing slug generation...');
        const slug = item.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100);
        
        console.log(`   ✅ Slug generated: "${slug}"`);
        
        if (slug.length === 0) {
          console.log(`   ❌ Slug became empty!`);
          console.log(`   🔍 This might be causing transformation errors\n`);
          continue;
        }
        
      } catch (slugError) {
        console.log(`   ❌ Slug generation failed: ${slugError.message}`);
        console.log(`   🔍 This might be causing transformation errors\n`);
        continue;
      }

      // Test basic content extraction
      try {
        console.log('   📄 Testing basic content extraction...');
        const content = item.content || item.contentSnippet || item.description || '';
        console.log(`   ✅ Content length: ${content.length} characters`);
        
        if (content.length === 0) {
          console.log(`   ⚠️ No content available - might rely on AI extraction`);
        }
        
      } catch (contentError) {
        console.log(`   ❌ Content extraction failed: ${contentError.message}`);
        console.log(`   🔍 This might be causing transformation errors\n`);
        continue;
      }

      console.log(`   ✅ Item ${i + 1} passed basic transformation tests\n`);
    }

    // Step 5: Test the actual import endpoint with just 1 article
    console.log('4️⃣ Testing actual import endpoint with 1 article...');
    try {
      const response = await axios.post('http://localhost:1337/api/news-feed/import', {
        categories: ['Science'],
        maxArticlesPerCategory: 1
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Import endpoint response:`, response.data);
      
      if (response.data.data.errors > 0) {
        console.log(`❌ Import had ${response.data.data.errors} error(s)`);
        console.log(`🔍 The error is likely in the AI content extraction or database creation step`);
      }
      
    } catch (importError) {
      console.log(`❌ Import endpoint failed: ${importError.message}`);
    }

  } catch (error) {
    console.log(`❌ Debug process failed: ${error.message}`);
    console.log(`🔍 Error details:`, error);
  }
}

debugTransformation().catch(console.error);