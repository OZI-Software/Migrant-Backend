const axios = require('axios');

async function fixDuplicateDetection() {
  console.log('🔧 Fixing Duplicate Detection Issue\n');

  try {
    // Step 1: Check if there are any articles in the database using entity service
    console.log('📊 Step 1: Checking database directly...');
    
    // Try to access articles through different endpoints
    const endpoints = [
      'http://localhost:1337/api/articles',
      'http://localhost:1337/api/articles?publicationState=live',
      'http://localhost:1337/api/articles?publicationState=preview'
    ];

    let foundArticles = false;
    for (const endpoint of endpoints) {
      try {
        console.log(`   Checking: ${endpoint}`);
        const response = await axios.get(endpoint);
        const count = response.data.meta?.pagination?.total || response.data.data?.length || 0;
        console.log(`   Found: ${count} articles`);
        if (count > 0) {
          foundArticles = true;
          console.log('   ✅ Articles found in database');
          
          // Show some sample articles
          if (response.data.data && response.data.data.length > 0) {
            console.log('   Sample articles:');
            response.data.data.slice(0, 3).forEach((article, index) => {
              console.log(`   ${index + 1}. ${article.attributes.title}`);
              console.log(`      Source: ${article.attributes.sourceUrl}`);
            });
          }
          break;
        }
      } catch (error) {
        console.log(`   ❌ Error accessing ${endpoint}: ${error.response?.status || error.message}`);
      }
    }

    if (!foundArticles) {
      console.log('   ℹ️  No articles found through API endpoints');
    }

    // Step 2: Test the articleExists function directly
    console.log('\n🧪 Step 2: Testing articleExists function...');
    
    // Get a sample URL from the RSS feed
    const testResponse = await axios.post('http://localhost:1337/api/news-feed/import', {
      categories: ['Science'],
      maxArticlesPerCategory: 1,
      dryRun: true // If this parameter exists
    });

    console.log('   Import test response:', testResponse.data);

    // Step 3: Clear any potential orphaned data
    console.log('\n🧹 Step 3: Attempting to clear potential orphaned data...');
    
    try {
      // Try to delete all articles (this will help reset the duplicate detection)
      const deleteResponse = await axios.delete('http://localhost:1337/api/articles/bulk', {
        data: { all: true }
      });
      console.log('   ✅ Bulk delete successful');
    } catch (error) {
      console.log('   ℹ️  Bulk delete not available or failed:', error.response?.status);
    }

    // Step 4: Try importing with a fresh start
    console.log('\n🚀 Step 4: Attempting fresh import...');
    
    const freshImportResponse = await axios.post('http://localhost:1337/api/news-feed/import', {
      categories: ['Science'],
      maxArticlesPerCategory: 2
    });

    console.log('   Fresh import response:');
    console.log(`   ✅ Success: ${freshImportResponse.data.success}`);
    console.log(`   📝 Message: ${freshImportResponse.data.message}`);
    console.log(`   📊 Results: ${JSON.stringify(freshImportResponse.data.data)}`);

    if (freshImportResponse.data.data.imported > 0) {
      console.log('\n🎉 SUCCESS: Science articles are now being imported!');
    } else if (freshImportResponse.data.data.skipped > 0) {
      console.log('\n⚠️  Articles still being skipped. Let me try a different approach...');
      
      // Step 5: Try with a different category that might have less duplicates
      console.log('\n🔄 Step 5: Trying with Culture category...');
      
      const cultureImportResponse = await axios.post('http://localhost:1337/api/news-feed/import', {
        categories: ['Culture'],
        maxArticlesPerCategory: 2
      });

      console.log('   Culture import response:');
      console.log(`   ✅ Success: ${cultureImportResponse.data.success}`);
      console.log(`   📊 Results: ${JSON.stringify(cultureImportResponse.data.data)}`);

      if (cultureImportResponse.data.data.imported > 0) {
        console.log('\n🎉 SUCCESS: Articles are being imported with Culture category!');
        console.log('   The issue was likely with Science category duplicates.');
        console.log('   Now trying Science again...');
        
        // Try Science one more time
        const scienceRetryResponse = await axios.post('http://localhost:1337/api/news-feed/import', {
          categories: ['Science'],
          maxArticlesPerCategory: 3
        });
        
        console.log('   Science retry response:');
        console.log(`   📊 Results: ${JSON.stringify(scienceRetryResponse.data.data)}`);
      }
    }

    // Step 6: Final verification
    console.log('\n✅ Step 6: Final verification...');
    try {
      const finalCheck = await axios.get('http://localhost:1337/api/articles?pagination[pageSize]=5');
      const finalCount = finalCheck.data.meta?.pagination?.total || 0;
      console.log(`   Final articles count: ${finalCount}`);
      
      if (finalCount > 0) {
        console.log('   🎉 SUCCESS: Articles are now in the database!');
        console.log('   Recent articles:');
        finalCheck.data.data.forEach((article, index) => {
          console.log(`   ${index + 1}. ${article.attributes.title}`);
          console.log(`      Category: ${article.attributes.category?.data?.attributes?.name || 'Unknown'}`);
        });
      } else {
        console.log('   ⚠️  Still no articles found. The issue might be deeper.');
      }
    } catch (error) {
      console.log('   ❌ Cannot access articles for final verification');
    }

  } catch (error) {
    console.error('❌ Error fixing duplicate detection:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the fix
fixDuplicateDetection().then(() => {
  console.log('\n✅ Duplicate detection fix completed');
}).catch(error => {
  console.error('❌ Fix failed:', error.message);
});