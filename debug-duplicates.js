const axios = require('axios');

async function debugDuplicates() {
  console.log('🔍 Debugging Duplicate Detection Issue\n');

  try {
    // Step 1: Get RSS feed items to test with
    console.log('📡 Step 1: Getting RSS feed items...');
    
    const testResponse = await axios.post('http://localhost:1337/api/news-feed/test-rss', {
      category: 'Science',
      limit: 5
    });

    if (testResponse.data.success) {
      const items = testResponse.data.items;
      console.log(`   ✅ Got ${items.length} items from Science RSS feed`);
      
      // Step 2: Test each item for duplicate detection
      console.log('\n🧪 Step 2: Testing duplicate detection for each item...');
      
      for (let i = 0; i < Math.min(3, items.length); i++) {
        const item = items[i];
        console.log(`\n   Testing item ${i + 1}:`);
        console.log(`   Title: ${item.title}`);
        console.log(`   Link: ${item.link}`);
        
        // Test if this article exists
        try {
          const existsResponse = await axios.post('http://localhost:1337/api/news-feed/check-exists', {
            sourceUrl: item.link
          });
          
          console.log(`   Exists check: ${existsResponse.data.exists}`);
          
          if (existsResponse.data.exists) {
            console.log('   ⚠️  Article marked as existing');
            
            // Try to find it in the database
            try {
              const findResponse = await axios.get(`http://localhost:1337/api/articles?filters[sourceUrl][$eq]=${encodeURIComponent(item.link)}`);
              console.log(`   Database search: Found ${findResponse.data.data.length} articles`);
              
              if (findResponse.data.data.length === 0) {
                console.log('   🐛 BUG: Article marked as existing but not found in database!');
              }
            } catch (findError) {
              console.log('   ❌ Cannot search database:', findError.response?.status);
            }
          } else {
            console.log('   ✅ Article not marked as existing');
          }
          
        } catch (existsError) {
          console.log(`   ❌ Cannot check exists: ${existsError.response?.status || existsError.message}`);
        }
      }
      
      // Step 3: Try importing one article
      console.log('\n🚀 Step 3: Attempting to import one Science article...');
      
      const importResponse = await axios.post('http://localhost:1337/api/news-feed/import', {
        categories: ['Science'],
        maxArticlesPerCategory: 1
      });
      
      console.log('   Import response:');
      console.log(`   ✅ Success: ${importResponse.data.success}`);
      console.log(`   📝 Message: ${importResponse.data.message}`);
      console.log(`   📊 Results: ${JSON.stringify(importResponse.data.data)}`);
      
      if (importResponse.data.data.imported > 0) {
        console.log('\n🎉 SUCCESS: Science article imported!');
        
        // Try importing more
        console.log('\n🔄 Trying to import more Science articles...');
        
        const moreImportResponse = await axios.post('http://localhost:1337/api/news-feed/import', {
          categories: ['Science'],
          maxArticlesPerCategory: 5
        });
        
        console.log('   More import results:');
        console.log(`   📊 Results: ${JSON.stringify(moreImportResponse.data.data)}`);
        
      } else if (importResponse.data.data.skipped > 0) {
        console.log('\n⚠️  All articles skipped as duplicates');
        console.log('   Let me try a different approach...');
        
        // Step 4: Try with different categories
        console.log('\n🔄 Step 4: Trying other categories...');
        
        const categories = ['Culture', 'Economy', 'Sport'];
        
        for (const category of categories) {
          console.log(`\n   Testing ${category} category:`);
          
          const categoryImportResponse = await axios.post('http://localhost:1337/api/news-feed/import', {
            categories: [category],
            maxArticlesPerCategory: 2
          });
          
          console.log(`   ${category} results: ${JSON.stringify(categoryImportResponse.data.data)}`);
          
          if (categoryImportResponse.data.data.imported > 0) {
            console.log(`   ✅ ${category} articles imported successfully!`);
            break;
          }
        }
      }
      
    } else {
      console.log('   ❌ Failed to get RSS feed items');
    }

  } catch (error) {
    console.error('❌ Error debugging duplicates:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the debug
debugDuplicates().then(() => {
  console.log('\n✅ Duplicate debugging completed');
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
});