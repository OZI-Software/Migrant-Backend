const axios = require('axios');

async function forceFreshImport() {
  console.log('🔄 Force Fresh Import for Science Articles\n');

  try {
    // Step 1: Try importing with different categories first to verify the system works
    console.log('🧪 Step 1: Testing import system with other categories...');
    
    const testCategories = ['Culture', 'Economy', 'Sport'];
    let systemWorking = false;
    
    for (const category of testCategories) {
      console.log(`\n   Testing ${category} category:`);
      
      try {
        const testResponse = await axios.post('http://localhost:1337/api/news-feed/import', {
          categories: [category],
          maxArticlesPerCategory: 1
        });
        
        console.log(`   ${category} results: imported=${testResponse.data.data.imported}, skipped=${testResponse.data.data.skipped}, errors=${testResponse.data.data.errors}`);
        
        if (testResponse.data.data.imported > 0) {
          console.log(`   ✅ ${category} import successful!`);
          systemWorking = true;
          break;
        }
      } catch (error) {
        console.log(`   ❌ ${category} import failed: ${error.response?.status || error.message}`);
      }
    }
    
    if (!systemWorking) {
      console.log('\n⚠️  Import system appears to have issues with all categories');
      console.log('   All articles are being skipped as duplicates');
      console.log('   This suggests a database state issue');
      
      // Step 2: Try to understand what's happening
      console.log('\n🔍 Step 2: Investigating the issue...');
      
      // Check if we can access any articles through the API
      try {
        const articlesResponse = await axios.get('http://localhost:1337/api/articles?pagination[pageSize]=1');
        console.log(`   Articles API accessible: ${articlesResponse.status === 200 ? 'Yes' : 'No'}`);
        console.log(`   Articles found: ${articlesResponse.data.meta?.pagination?.total || 0}`);
      } catch (apiError) {
        console.log(`   Articles API error: ${apiError.response?.status || apiError.message}`);
      }
      
      // Try to get RSS feed to verify it's working
      try {
        const rssResponse = await axios.post('http://localhost:1337/api/news-feed/test-rss', {
          category: 'Science',
          limit: 1
        });
        
        if (rssResponse.data.success) {
          console.log(`   RSS feed working: Yes (${rssResponse.data.items.length} items)`);
          
          if (rssResponse.data.items.length > 0) {
            const firstItem = rssResponse.data.items[0];
            console.log(`   Sample article: ${firstItem.title}`);
            console.log(`   Sample URL: ${firstItem.link}`);
          }
        } else {
          console.log('   RSS feed working: No');
        }
      } catch (rssError) {
        console.log(`   RSS feed error: ${rssError.response?.status || rssError.message}`);
      }
      
      console.log('\n💡 Possible solutions:');
      console.log('   1. The database might have orphaned records');
      console.log('   2. There might be a caching issue');
      console.log('   3. The articleExists function might have a bug');
      console.log('   4. The RSS feed URLs might have changed');
      
    } else {
      console.log('\n✅ Import system is working with other categories');
      
      // Step 3: Now try Science with increased limit
      console.log('\n🔬 Step 3: Trying Science import with higher limits...');
      
      const scienceLimits = [1, 3, 5, 10];
      
      for (const limit of scienceLimits) {
        console.log(`\n   Trying Science with limit ${limit}:`);
        
        try {
          const scienceResponse = await axios.post('http://localhost:1337/api/news-feed/import', {
            categories: ['Science'],
            maxArticlesPerCategory: limit
          });
          
          const results = scienceResponse.data.data;
          console.log(`   Results: imported=${results.imported}, skipped=${results.skipped}, errors=${results.errors}`);
          
          if (results.imported > 0) {
            console.log(`   🎉 SUCCESS: Science articles imported with limit ${limit}!`);
            
            // Verify the articles were created
            try {
              const verifyResponse = await axios.get('http://localhost:1337/api/articles?filters[category][name][$eq]=Science&pagination[pageSize]=5');
              const scienceArticles = verifyResponse.data.data || [];
              console.log(`   ✅ Verification: ${scienceArticles.length} Science articles found in database`);
              
              if (scienceArticles.length > 0) {
                console.log('   Recent Science articles:');
                scienceArticles.forEach((article, index) => {
                  console.log(`   ${index + 1}. ${article.attributes.title}`);
                });
              }
            } catch (verifyError) {
              console.log(`   ⚠️  Cannot verify articles: ${verifyError.response?.status}`);
            }
            
            break;
          } else if (results.skipped > 0) {
            console.log(`   ⚠️  All ${results.skipped} articles skipped as duplicates`);
          }
          
        } catch (scienceError) {
          console.log(`   ❌ Science import failed: ${scienceError.response?.status || scienceError.message}`);
        }
      }
    }
    
    // Step 4: Final status check
    console.log('\n📊 Step 4: Final status check...');
    
    try {
      const finalResponse = await axios.get('http://localhost:1337/api/articles?pagination[pageSize]=10');
      const totalArticles = finalResponse.data.meta?.pagination?.total || 0;
      console.log(`   Total articles in system: ${totalArticles}`);
      
      if (totalArticles > 0) {
        // Check categories
        const categories = {};
        finalResponse.data.data.forEach(article => {
          const categoryName = article.attributes.category?.data?.attributes?.name || 'Unknown';
          categories[categoryName] = (categories[categoryName] || 0) + 1;
        });
        
        console.log('   Articles by category:');
        Object.entries(categories).forEach(([category, count]) => {
          console.log(`   - ${category}: ${count}`);
        });
        
        const scienceCount = categories['Science'] || 0;
        if (scienceCount > 0) {
          console.log(`\n🎉 SUCCESS: ${scienceCount} Science articles are now in the system!`);
        } else {
          console.log('\n⚠️  No Science articles found in the final check');
        }
      } else {
        console.log('\n❌ No articles found in the system');
      }
      
    } catch (finalError) {
      console.log(`   ❌ Final check failed: ${finalError.response?.status || finalError.message}`);
    }

  } catch (error) {
    console.error('❌ Error in force fresh import:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the force fresh import
forceFreshImport().then(() => {
  console.log('\n✅ Force fresh import completed');
}).catch(error => {
  console.error('❌ Force fresh import failed:', error.message);
});